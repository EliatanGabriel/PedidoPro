import type { Prisma } from "@prisma/client";

export async function reserveStock(tx: Prisma.TransactionClient, input: { companyId: string; productId: string; quantity: number; allowNegativeStock: boolean }) {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_STOCK_QUANTITY");
  const result = await tx.product.updateMany({
    where: {
      id: input.productId,
      companyId: input.companyId,
      isActive: true,
      ...(input.allowNegativeStock ? {} : { stock: { gte: input.quantity } }),
    },
    data: { stock: { decrement: input.quantity } },
  });
  return result.count === 1;
}
