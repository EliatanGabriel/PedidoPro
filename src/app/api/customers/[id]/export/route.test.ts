import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getTenantContext: vi.fn(), can: vi.fn(), findFirst: vi.fn(), auditCreate: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.getTenantContext, can: mocks.can }));
vi.mock("@/lib/prisma", () => ({ prisma: { customer: { findFirst: mocks.findFirst }, auditLog: { create: mocks.auditCreate } } }));

import { GET } from "./route";

describe("customer data export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({ user: { id: "user-a" }, company: { id: "company-a", name: "Loja A", isActive: true }, membership: { role: "OWNER" } });
    mocks.can.mockReturnValue(true);
    mocks.findFirst.mockResolvedValue({ id: "customer-a", name: "Cliente A", orders: [{ number: 1, items: [{ productName: "Produto", quantity: 1, unitPriceCents: 100, totalCents: 100 }] }] });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("exports only the selected customer's tenant-scoped record and audits access", async () => {
    const response = await GET(new Request("https://app.example/api/customers/customer-a/export"), { params: Promise.resolve({ id: "customer-a" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-a", companyId: "company-a" } }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "customer.data_exported", companyId: "company-a" }) }));
    const payload = await response.json();
    expect(payload.customer.orders[0].items[0]).not.toHaveProperty("unitCostCents");
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        orders: expect.objectContaining({
          select: expect.objectContaining({
            payments: expect.objectContaining({ select: expect.objectContaining({ transactionReference: true, notes: true, refundReference: true, refundReason: true }) }),
          }),
        }),
      }),
    }));
  });

  it("does not export records for employees without customer access", async () => {
    mocks.can.mockReturnValue(false);
    const response = await GET(new Request("https://app.example/api/customers/customer-a/export"), { params: Promise.resolve({ id: "customer-a" }) });
    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
