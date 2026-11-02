import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  findMany: vi.fn(),
  customerFindFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.context }));
vi.mock("@/lib/prisma", () => ({ prisma: { privacyRequest: { findMany: mocks.findMany }, customer: { findFirst: mocks.customerFindFirst }, $transaction: mocks.transaction } }));

import { GET, POST } from "./route";

describe("privacy request endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ user: { id: "owner-a" }, membership: { role: "OWNER" }, company: { id: "company-a", isActive: true } });
    mocks.findMany.mockResolvedValue([]);
  });

  it("restricts request listings to the owner's company", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-a" } }));
  });

  it("rejects attempts to link a request to another company's customer", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);
    const response = await POST(new Request("https://app.example/api/privacy-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cm123456789012345678901234", type: "ACCESS" }),
    }));
    expect(response.status).toBe(404);
    expect(mocks.customerFindFirst).toHaveBeenCalledWith({ where: { id: "cm123456789012345678901234", companyId: "company-a", NOT: { name: { startsWith: "Cliente anonimizado " } } }, select: { id: true } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("denies employees without querying requests", async () => {
    mocks.context.mockResolvedValue({ user: { id: "employee-a" }, membership: { role: "EMPLOYEE" }, company: { id: "company-a", isActive: true } });
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
