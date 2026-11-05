import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  {
    code: "free",
    name: "Gratuito",
    priceCents: 0,
    monthlyOrderLimit: 300,
    productLimit: 200,
    userLimit: 3,
    features: ["dashboard_basic", "orders", "reports", "expenses", "stock", "public_store"],
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 2990,
    monthlyOrderLimit: 0,
    productLimit: 0,
    userLimit: 10,
    features: [
      "dashboard_basic",
      "orders",
      "reports",
      "advanced_reports",
      "expenses",
      "stock",
      "public_store",
    ],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: plan,
    });
  }

  console.log("Planos cadastrados com sucesso!");
}

main()
  .catch((error) => {
    console.error("Erro ao cadastrar os planos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
