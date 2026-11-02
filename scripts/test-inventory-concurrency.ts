async function main() {
  const connection = process.env.TEST_DATABASE_URL;
  if (!connection) throw new Error("Defina TEST_DATABASE_URL para um banco PostgreSQL de teste isolado.");
  const databaseName = new URL(connection).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) throw new Error("Por segurança, o banco de TEST_DATABASE_URL precisa ter 'test' no nome.");
  if (process.env.ALLOW_TEST_DATABASE_WRITES !== "YES") throw new Error("Defina ALLOW_TEST_DATABASE_WRITES=YES para autorizar a criação/remoção de dados de teste.");

  process.env.DATABASE_URL = connection;
  const { PrismaClient } = await import("@prisma/client");
  const { randomUUID } = await import("node:crypto");
  const { reserveStock } = await import("../src/lib/inventory");
  const prisma = new PrismaClient();
  const slug = `stock-race-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  let companyId: string | undefined;

  try {
    const company = await prisma.company.create({ data: { name: "Inventory concurrency test", slug } });
    companyId = company.id;
    const product = await prisma.product.create({ data: { companyId, name: "Race test product", priceCents: 1000, stock: 5 } });
    const attempts = await Promise.allSettled([1, 2].map(() => prisma.$transaction(
      (tx) => reserveStock(tx, { companyId: company.id, productId: product.id, quantity: 4, allowNegativeStock: false }),
      { isolationLevel: "Serializable" },
    )));
    const serializationErrors = attempts.filter((attempt) => attempt.status === "rejected");
    if (serializationErrors.some((attempt) => !(attempt.reason && typeof attempt.reason === "object" && "code" in attempt.reason && attempt.reason.code === "P2034"))) {
      throw serializationErrors.find((attempt) => attempt.status === "rejected")?.reason ?? new Error("Erro inesperado na concorrência.");
    }
    const successfulReservations = attempts.filter((attempt) => attempt.status === "fulfilled" && attempt.value).length;
    const finalProduct = await prisma.product.findFirstOrThrow({ where: { id: product.id, companyId } });
    if (successfulReservations !== 1 || finalProduct.stock !== 1) {
      throw new Error(`Concorrência inconsistente: reservas=${successfulReservations}, estoqueFinal=${finalProduct.stock}.`);
    }
    console.log("OK: uma reserva foi aceita, a outra foi recusada/abortada e o estoque final permaneceu em 1.");
  } finally {
    if (companyId) await prisma.company.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha no teste de concorrência.");
  process.exitCode = 1;
});
