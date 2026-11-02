import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantContext: vi.fn(),
  userFindUnique: vi.fn(),
  memberFindFirst: vi.fn(),
  memberFindUnique: vi.fn(),
  memberCount: vi.fn(),
  memberUpsert: vi.fn(),
  auditCreate: vi.fn(),
  subscriptionFindUnique: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({ getTenantContext: mocks.getTenantContext }));
vi.mock("@/lib/plans", () => ({ subscriptionIsActive: vi.fn(() => true) }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique },
  companyMember: { findFirst: mocks.memberFindFirst, findUnique: mocks.memberFindUnique, count: mocks.memberCount, upsert: mocks.memberUpsert },
  subscription: { findUnique: mocks.subscriptionFindUnique },
  auditLog: { create: mocks.auditCreate },
} }));

import { POST } from "./route";

describe("POST /api/company/members role validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantContext.mockResolvedValue({
      user: { id: "owner-a" },
      membership: { role: "OWNER" },
      company: { id: "company-a", isActive: true },
    });
  });

  it("rejects the legacy unrestricted manager role", async () => {
    const response = await POST(new Request("https://app.example/api/company/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "employee@example.com", role: "MANAGER", permissions: [] }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
    expect(mocks.memberUpsert).not.toHaveBeenCalled();
  });
});
