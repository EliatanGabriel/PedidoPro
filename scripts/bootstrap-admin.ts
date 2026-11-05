import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

try {
  loadEnvFile(".env");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
}

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3];
const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Administrador Ordexa";
const confirmed = process.argv.includes("--confirm-admin");

async function upsertCredentialAccount(userId: string, hash: string) {
  const credential = await prisma.account.findFirst({ where: { userId, providerId: "credential" }, select: { id: true } });
  if (credential) {
    await prisma.account.update({ where: { id: credential.id }, data: { password: hash } });
    return;
  }
  await prisma.account.create({ data: { userId, providerId: "credential", accountId: userId, password: hash } });
}

async function main() {
  if (!email || !email.includes("@") || !password || !confirmed) {
    throw new Error("Uso: npm run admin:bootstrap -- usuario@dominio.com 'SenhaForte' --confirm-admin");
  }
  if (password.length < 10) throw new Error("A senha precisa ter pelo menos 10 caracteres.");

  const hash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, platformRole: true } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { platformRole: "PLATFORM_ADMIN", emailVerified: true },
    });
    await upsertCredentialAccount(existing.id, hash);
    await prisma.auditLog.create({
      data: {
        userId: existing.id,
        action: "platform.admin_bootstrapped",
        entity: "User",
        entityId: existing.id,
        metadata: { source: "trusted_cli", updatedPassword: true },
      },
    });
    console.info(`Conta ${existing.email} promovida a administradora e senha atualizada.`);
    return;
  }

  const user = await prisma.user.create({
    data: { name, email, emailVerified: true, platformRole: "PLATFORM_ADMIN" },
    select: { id: true, email: true },
  });
  await upsertCredentialAccount(user.id, hash);
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "platform.admin_bootstrapped",
      entity: "User",
      entityId: user.id,
      metadata: { source: "trusted_cli", createdUser: true },
    },
  });
  console.info(`Conta administradora ${user.email} criada. Entre em /login e acesse /admin.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao criar o administrador.");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
