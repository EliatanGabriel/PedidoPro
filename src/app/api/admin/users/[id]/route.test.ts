import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdmin: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/platform-admin", () => ({ getPlatformAdmin: mocks.getPlatformAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.userFindUnique }, $transaction: mocks.transaction } }));

import { PATCH } from "./route";

function request(body: unknown) {
  return new Request("https://app.example/api/admin/users/u1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({ user: { update: mocks.userUpdate }, auditLog: { create: mocks.auditCreate } }));
  });

  it("denies users without platform admin role", async () => {
    mocks.getPlatformAdmin.mockResolvedValue(null);
    const response = await PATCH(request({ platformRole: "USER" }), { params: Promise.resolve({ id: "u1" }) });
    expect(response.status).toBe(403);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("prevents an admin from removing their own access", async () => {
    mocks.getPlatformAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.userFindUnique.mockResolvedValue({ id: "admin-1", email: "admin@example.com", platformRole: "PLATFORM_ADMIN" });
    const response = await PATCH(request({ platformRole: "USER" }), { params: Promise.resolve({ id: "admin-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("promotes a user and records an audit event", async () => {
    mocks.getPlatformAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.userFindUnique.mockResolvedValue({ id: "u1", email: "user@example.com", platformRole: "USER" });
    mocks.userUpdate.mockResolvedValue({ id: "u1", email: "user@example.com", platformRole: "PLATFORM_ADMIN" });
    const response = await PATCH(request({ platformRole: "PLATFORM_ADMIN" }), { params: Promise.resolve({ id: "u1" }) });
    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" }, data: { platformRole: "PLATFORM_ADMIN" } }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "platform.user_role_updated", entityId: "u1" }) }));
  });
});
