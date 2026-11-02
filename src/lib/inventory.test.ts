import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { reserveStock } from "./inventory";

describe("stock reservation", () => {
  it("uses an atomic stock lower bound for tracked inventory", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { product: { updateMany } } as unknown as Prisma.TransactionClient;
    const result = await reserveStock(tx, { companyId: "company-a", productId: "product-a", quantity: 3, allowNegativeStock: false });
    expect(result).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "product-a", companyId: "company-a", isActive: true, stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });
  });

  it("only skips the lower bound when negative stock is explicitly enabled", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { product: { updateMany } } as unknown as Prisma.TransactionClient;
    await reserveStock(tx, { companyId: "company-a", productId: "product-a", quantity: 2, allowNegativeStock: true });
    expect(updateMany.mock.calls[0][0].where).toEqual({ id: "product-a", companyId: "company-a", isActive: true });
  });

  it("rejects invalid quantities before making a database call", async () => {
    const updateMany = vi.fn();
    const tx = { product: { updateMany } } as unknown as Prisma.TransactionClient;
    await expect(reserveStock(tx, { companyId: "company-a", productId: "product-a", quantity: 0, allowNegativeStock: false })).rejects.toThrow("INVALID_STOCK_QUANTITY");
    expect(updateMany).not.toHaveBeenCalled();
  });
});
