import { betterAuth } from "better-auth";
import { after } from "next/server";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { authEmailConfigured, sendAuthEmail } from "@/lib/email";

const secret = process.env.BETTER_AUTH_SECRET;
async function scheduleAuthEmail(message: Parameters<typeof sendAuthEmail>[0]): Promise<void> {
  after(async () => {
    try {
      await sendAuthEmail(message);
    } catch {
      console.error("O provedor de e-mail não aceitou uma mensagem de autenticação.");
    }
  });
}
if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET precisa ter pelo menos 32 caracteres em produção.");
}

export const auth = betterAuth({
  appName: "PedidoPro",
  baseURL: process.env.BETTER_AUTH_URL,
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    ...(authEmailConfigured ? {
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => scheduleAuthEmail({ to: user.email, subject: "Redefina sua senha do PedidoPro", intro: "Recebemos uma solicitação para redefinir a senha da sua conta.", actionLabel: "Criar nova senha", actionUrl: url }),
      resetPasswordTokenExpiresIn: 60 * 60,
    } : {}),
  },
  emailVerification: authEmailConfigured ? {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: ({ user, url }: { user: { email: string }; url: string }) => scheduleAuthEmail({ to: user.email, subject: "Confirme seu e-mail do PedidoPro", intro: "Confirme que este endereço de e-mail pertence a você.", actionLabel: "Confirmar e-mail", actionUrl: url }),
  } : undefined,
  rateLimit: { enabled: true, window: 60, max: 30, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 }, "/request-password-reset": { window: 60, max: 3 }, "/send-verification-email": { window: 60, max: 3 } } },
  user: { additionalFields: { platformRole: { type: "string", required: false, defaultValue: "USER", input: false } } },
  trustedOrigins: process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : undefined,
});
