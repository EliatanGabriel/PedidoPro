import { describe, expect, it } from "vitest";
import { calculateOrderTotals, canTransitionDelivery, canTransitionOrder, derivePaymentStatus, calculateEstimatedNetCents } from "./order-rules";

describe("order rules", () => {
  it("calculates cents using integer arithmetic", () => {
    expect(calculateOrderTotals([{ unitPriceCents: 1299, quantity: 2 }, { unitPriceCents: 500, quantity: 1 }], 199, 700)).toEqual({ subtotalCents: 3098, discountCents: 199, deliveryCents: 700, totalCents: 3599 });
  });
  it("rejects a discount greater than the subtotal", () => {
    expect(() => calculateOrderTotals([{ unitPriceCents: 100, quantity: 1 }], 101, 0)).toThrow("DISCOUNT_TOO_HIGH");
  });
  it("rejects fractional quantities", () => {
    expect(() => calculateOrderTotals([{ unitPriceCents: 100, quantity: 1.5 }], 0, 0)).toThrow("INVALID_LINE");
  });
  it("allows forward progress and rejects reopening terminal orders", () => {
    expect(canTransitionOrder("NEW", "PREPARING")).toBe(true);
    expect(canTransitionOrder("COMPLETED", "PREPARING")).toBe(false);
    expect(canTransitionOrder("CANCELED", "COMPLETED")).toBe(false);
  });
  it("keeps delivered shipments terminal", () => {
    expect(canTransitionDelivery("IN_TRANSIT", "DELIVERED")).toBe(true);
    expect(canTransitionDelivery("DELIVERED", "PREPARING")).toBe(false);
  });
  it("calculates estimated net result only when every sold item has a recorded cost", () => {
    expect(calculateEstimatedNetCents([{ totalCents: 2500, items: [{ quantity: 2, unitCostCents: 700 }] }], [300])).toBe(800);
    expect(calculateEstimatedNetCents([{ totalCents: 2500, items: [{ quantity: 2, unitCostCents: null }] }], [])).toBeNull();
  });
  it("subtracts manual refunds from estimated net result and rejects invalid refund totals", () => {
    expect(calculateEstimatedNetCents([{ totalCents: 2500, refundedCents: 500, items: [{ quantity: 2, unitCostCents: 700 }] }], [300])).toBe(300);
    expect(calculateEstimatedNetCents([{ totalCents: 2500, refundedCents: 2600, items: [] }], [])).toBeNull();
  });
  it("recalculates payment status after manual refunds", () => {
    expect(derivePaymentStatus(1000, [{ amountCents: 1000, status: "REFUNDED" }])).toBe("REFUNDED");
    expect(derivePaymentStatus(1000, [{ amountCents: 400, status: "PAID" }, { amountCents: 600, status: "REFUNDED" }])).toBe("PARTIALLY_PAID");
    expect(derivePaymentStatus(1000, [{ amountCents: 1000, status: "PAID" }])).toBe("PAID");
  });
});
