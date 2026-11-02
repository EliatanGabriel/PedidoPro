import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantContext: vi.fn(),
  can: vi.fn(),
  customerFindFirst: vi.fn(),
  transaction: vi.fn(),
  orderFindMany: vi.fn(),
  orderUpdateMany: vi.fn(),
  deliveryUpdateMany: vi.fn(),
  paymentUpdateMany: vi.fn(),
  customerUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.getTenantContext, can: mocks.can }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  customer: { findFirst: mocks.customerFindFirst },
  $transaction: mocks.transaction,
} }));

import { POST } from "./route";

describe("POST /api/customers/[id]/anonymize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({ user: { id: "owner-a" }, company: { id: "company-a", isActive: true }, membership: { role: "OWNER" } });
    mocks.can.mockReturnValue(true);
    mocks.customerFindFirst.mockResolvedValue({ id: "customer-a" });
    mocks.orderFindMany.mockResolvedValue([{ id: "order-a" }]);
    mocks.transaction.mockImplementation((callback) => callback({
      order: { findMany: mocks.orderFindMany, updateMany: mocks.orderUpdateMany },
      delivery: { updateMany: mocks.deliveryUpdateMany },
      payment: { updateMany: mocks.paymentUpdateMany },
      customer: { update: mocks.customerUpdate },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  it("removes personal free text from related records while retaining financial amounts", async () => {
    const response = await POST(new Request("https://app.example/api/customers/customer-a/anonymize", { method: "POST" }), { params: Promise.resolve({ id: "customer-a" }) });

    expect(response.status).toBe(200);
    expect(mocks.paymentUpdateMany).toHaveBeenCalledWith({
      where: { orderId: { in: ["order-a"] } },
      data: { transactionReference: null, notes: null, refundReference: null, refundReason: null },
    });
    expect(mocks.customerUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ phone: null, email: null, taxId: null }),
    }));
    expect(mocks.auditCreate).toHaveBeenCalled();
  });

  it("does not access customer records without customer permission", async () => {
    mocks.can.mockReturnValue(false);
    const response = await POST(new Request("https://app.example/api/customers/customer-a/anonymize", { method: "POST" }), { params: Promise.resolve({ id: "customer-a" }) });

    expect(response.status).toBe(403);
    expect(mocks.customerFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
