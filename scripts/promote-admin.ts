import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();
const confirmed = process.argv.includes("--confirm-admin");

async function main() {
  if (!email || !email.includes("@") || !confirmed) {
    throw new Error("Uso: npm run admin:promote -- usuario@dominio.com --confirm-admin");
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, platformRole: true } });
  if (!user) throw new Error("Conta não encontrada. Cadastre-se primeiro e execute novamente.");
  if (user.platformRole === "PLATFORM_ADMIN") {
    console.info(`A conta ${user.email} já é administradora da plataforma.`);
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { platformRole: "PLATFORM_ADMIN" } });
    await tx.auditLog.create({ data: { userId: user.id, action: "platform.admin_promoted", entity: "User", entityId: user.id, metadata: { provisionedBy: "trusted_cli" } } });
  });
  console.info(`Acesso de administração concedido a ${user.email}. Entre novamente para abrir /admin.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao conceder acesso administrativo.");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
