export type OrderState = "NEW" | "AWAITING_PAYMENT" | "PAYMENT_APPROVED" | "PREPARING" | "READY_FOR_PICKUP" | "OUT_FOR_DELIVERY" | "COMPLETED" | "CANCELED";

export const validOrderTransitions: Record<OrderState, readonly OrderState[]> = {
  NEW: ["AWAITING_PAYMENT", "PAYMENT_APPROVED", "PREPARING", "CANCELED"],
  AWAITING_PAYMENT: ["PAYMENT_APPROVED", "CANCELED"],
  PAYMENT_APPROVED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELED"],
  READY_FOR_PICKUP: ["COMPLETED", "OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

export function canTransitionOrder(from: OrderState, to: OrderState) {
  return validOrderTransitions[from].includes(to);
}

export type DeliveryState = "AWAITING_PICKUP" | "PREPARING" | "READY_FOR_PICKUP" | "IN_TRANSIT" | "DELIVERED" | "FAILED";
export const validDeliveryTransitions: Record<DeliveryState, readonly DeliveryState[]> = {
  AWAITING_PICKUP: ["PREPARING", "READY_FOR_PICKUP", "FAILED"],
  PREPARING: ["READY_FOR_PICKUP", "FAILED"],
  READY_FOR_PICKUP: ["IN_TRANSIT", "DELIVERED", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: ["PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT"],
};

export function canTransitionDelivery(from: DeliveryState, to: DeliveryState) {
  return from === to || validDeliveryTransitions[from].includes(to);
}

export function derivePaymentStatus(totalCents: number, payments: { amountCents: number; status: string }[]) {
  const paidCents = payments.reduce((sum, payment) => sum + (payment.status === "PAID" ? payment.amountCents : 0), 0);
  if (totalCents > 0 && paidCents >= totalCents) return "PAID" as const;
  if (paidCents > 0) return "PARTIALLY_PAID" as const;
  if (payments.some((payment) => payment.status === "REFUNDED")) return "REFUNDED" as const;
  return "PENDING" as const;
}

export function calculateOrderTotals(lines: { unitPriceCents: number; quantity: number }[], discountCents: number, deliveryCents: number) {
  const maxInt = 2_147_483_647;
  if (lines.some((line) => !Number.isSafeInteger(line.unitPriceCents) || line.unitPriceCents < 0 || line.unitPriceCents > maxInt || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > maxInt)) throw new Error("INVALID_LINE");
  if (!Number.isSafeInteger(discountCents) || discountCents < 0 || discountCents > maxInt || !Number.isSafeInteger(deliveryCents) || deliveryCents < 0 || deliveryCents > maxInt) throw new Error("INVALID_ADJUSTMENT");
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > maxInt) throw new Error("TOTAL_OUT_OF_RANGE");
  if (discountCents > subtotalCents) throw new Error("DISCOUNT_TOO_HIGH");
  const totalCents = subtotalCents - discountCents + deliveryCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > maxInt) throw new Error("TOTAL_OUT_OF_RANGE");
  return { subtotalCents, discountCents, deliveryCents, totalCents };
}

export function calculateEstimatedNetCents(orders: { totalCents: number; refundedCents?: number; items: { quantity: number; unitCostCents: number | null }[] }[], expensesCents: number[]) {
  let result = 0;
  for (const order of orders) {
    result += order.totalCents - (order.refundedCents ?? 0);
    for (const item of order.items) {
      if (item.unitCostCents === null) return null;
      result -= item.quantity * item.unitCostCents;
    }
  }
  for (const expense of expensesCents) result -= expense;
  return Number.isSafeInteger(result) && orders.every((order) => Number.isSafeInteger(order.refundedCents ?? 0) && (order.refundedCents ?? 0) >= 0 && (order.refundedCents ?? 0) <= order.totalCents) ? result : null;
}
