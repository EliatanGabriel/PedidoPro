import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantContext: vi.fn(),
  can: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.getTenantContext, can: mocks.can }));
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findMany: mocks.findMany } } }));

import { GET, POST } from "./route";

describe("GET /api/orders tenant boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({
      user: { id: "user-a" },
      membership: { role: "OWNER", permissions: [] },
      company: { id: "company-a", isActive: true },
    });
    mocks.can.mockReturnValue(true);
    mocks.findMany.mockResolvedValue([]);
  });

  it("always scopes reads to the authenticated company's ID", async () => {
    const response = await GET(new Request("https://app.example/api/orders?companyId=company-b"));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "company-a" } }));
  });

  it("does not query order data when the user lacks permission", async () => {
    mocks.can.mockReturnValue(false);
    const response = await GET(new Request("https://app.example/api/orders"));
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not allow order creators without customer permission to attach a saved customer", async () => {
    mocks.can.mockImplementation((_context, permission) => permission !== "manage_customers");
    const response = await POST(new Request("https://app.example/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: "cm123456789012345678901234", items: [{ productId: "cm234567890123456789012345", quantity: 1 }] }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
