import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { after } from "next/server";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { authEmailConfigured, sendAuthEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const secret = process.env.BETTER_AUTH_SECRET;
async function scheduleAuthEmail(message: Parameters<typeof sendAuthEmail>[0]): Promise<void> {
  after(async () => {
    try {
      await sendAuthEmail(message);
    } catch (error) {
      logger.error("auth.email_failed", error);
    }
  });
}
if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

const companiesPendingDeletion = new WeakMap<object, string>();

async function beforeDelete(user: { id: string }, request?: Request) {
  const membership = await prisma.companyMember.findFirst({
    where: { userId: user.id },
    include: {
      company: {
        include: {
          members: { select: { id: true } },
          subscription: { select: { provider: true, status: true } },
        },
      },
    },
  });
  if (!membership) return;
  if (membership.role === "OWNER") {
    if (membership.company.members.length > 1) {
      throw new APIError("BAD_REQUEST", { message: "Remova os demais membros da equipe antes de excluir a conta." });
    }
    if (membership.company.subscription?.provider === "MERCADO_PAGO" && membership.company.subscription.status === "ACTIVE") {
      throw new APIError("BAD_REQUEST", { message: "Cancele a assinatura antes de excluir a conta." });
    }
    if (request) companiesPendingDeletion.set(request, membership.companyId);
  }
  await prisma.auditLog.create({
    data: {
      companyId: membership.companyId,
      userId: user.id,
      action: "account.deletion_requested",
      entity: "User",
      entityId: user.id,
      metadata: { role: membership.role },
    },
  });
}

async function afterDelete(user: { id: string }, request?: Request) {
  const companyId = request ? companiesPendingDeletion.get(request) : undefined;
  if (companyId) {
    try {
      await prisma.company.delete({ where: { id: companyId } });
      logger.info("account.company_deleted", { companyId });
    } catch (error) {
      logger.error("account.company_delete_failed", error, { companyId });
    }
  }
  logger.info("account.deleted", { userId: user.id, companyDeleted: Boolean(companyId) });
}

export const auth = betterAuth({
  appName: "Ordexa",
  baseURL: process.env.BETTER_AUTH_URL,
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    ...(authEmailConfigured ? {
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => scheduleAuthEmail({ to: user.email, subject: "Redefina sua senha do Ordexa", intro: "Recebemos uma solicitação para redefinir a senha da sua conta.", actionLabel: "Criar nova senha", actionUrl: url }),
      resetPasswordTokenExpiresIn: 60 * 60,
    } : {}),
  },
  emailVerification: authEmailConfigured ? {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: ({ user, url }: { user: { email: string }; url: string }) => scheduleAuthEmail({ to: user.email, subject: "Confirme seu e-mail do Ordexa", intro: "Confirme que este endereço de e-mail pertence a você.", actionLabel: "Confirmar e-mail", actionUrl: url }),
  } : undefined,
  rateLimit: { enabled: !(process.env.DISABLE_AUTH_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production"), window: 60, max: 30, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 }, "/request-password-reset": { window: 60, max: 3 }, "/send-verification-email": { window: 60, max: 3 } } },
  user: {
    additionalFields: { platformRole: { type: "string", required: false, defaultValue: "USER", input: false } },
    deleteUser: { enabled: true, beforeDelete, afterDelete },
  },
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : undefined,
});
