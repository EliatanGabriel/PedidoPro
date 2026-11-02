import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantContext: vi.fn(),
  can: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.getTenantContext, can: mocks.can }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { PATCH } from "./route";

describe("PATCH /api/orders/[id] permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({
      user: { id: "employee-a" },
      membership: { role: "EMPLOYEE", permissions: ["edit_orders"] },
      company: { id: "company-a", isActive: true, allowNegativeStock: false },
    });
    mocks.can.mockImplementation((_context, permission) => permission === "edit_orders");
  });

  it("does not let an order editor attach a saved customer without customer permission", async () => {
    const response = await PATCH(new Request("https://app.example/api/orders/order-a", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: "cm123456789012345678901234",
        fulfillment: "PICKUP",
        discountCents: 0,
        deliveryCents: 0,
        items: [{ productId: "cm234567890123456789012345", quantity: 1 }],
      }),
    }), { params: Promise.resolve({ id: "order-a" }) });

    expect(response.status).toBe(403);
    expect(mocks.can).toHaveBeenCalledWith(expect.anything(), "manage_customers");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
