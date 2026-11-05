import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));

import { getPlatformAdmin } from "./platform-admin";

describe("getPlatformAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
  });

  it("returns null without a session", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(getPlatformAdmin()).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a regular user", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } });
    mocks.findUnique.mockResolvedValue({ id: "user-1", name: "Ana", email: "ana@example.com", platformRole: "USER" });
    await expect(getPlatformAdmin()).resolves.toBeNull();
  });

  it("returns the platform administrator", async () => {
    const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", platformRole: "PLATFORM_ADMIN" };
    mocks.getSession.mockResolvedValue({ user: { id: "admin-1" } });
    mocks.findUnique.mockResolvedValue(admin);
    await expect(getPlatformAdmin()).resolves.toEqual(admin);
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "admin-1" } }));
  });
});
