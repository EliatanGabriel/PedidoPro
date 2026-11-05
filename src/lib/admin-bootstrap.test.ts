import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  update: vi.fn(),
  auditCreate: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { info: mocks.loggerInfo } }));

import { ensureBootstrapAdmin } from "./admin-bootstrap";

const user = { id: "user-1", name: "Ana", email: "Ana@Example.com", platformRole: "USER" };

describe("ensureBootstrapAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({ user: { update: mocks.update }, auditLog: { create: mocks.auditCreate } }),
    );
    mocks.update.mockResolvedValue({ platformRole: "PLATFORM_ADMIN" });
    mocks.auditCreate.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
  });

  it("does nothing when the variable is not configured", async () => {
    await expect(ensureBootstrapAdmin(user)).resolves.toBe(user);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does nothing for a different e-mail", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "outra@example.com";
    await expect(ensureBootstrapAdmin(user)).resolves.toBe(user);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("promotes the matching e-mail and records an audit entry", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@example.com, ana@example.com";
    await expect(ensureBootstrapAdmin(user)).resolves.toEqual({ ...user, platformRole: "PLATFORM_ADMIN" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-1" }, data: { platformRole: "PLATFORM_ADMIN" } }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "platform.admin_bootstrapped", entityId: "user-1" }) }));
    expect(mocks.loggerInfo).toHaveBeenCalledWith("platform.admin_bootstrapped", { userId: "user-1" });
  });

  it("does not touch an existing administrator", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = "ana@example.com";
    const admin = { ...user, platformRole: "PLATFORM_ADMIN" };
    await expect(ensureBootstrapAdmin(admin)).resolves.toBe(admin);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
