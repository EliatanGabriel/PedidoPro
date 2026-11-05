import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPlatformAdmin: vi.fn(),
  emailFindUnique: vi.fn(),
  emailUpdate: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/platform-admin", () => ({ getPlatformAdmin: mocks.getPlatformAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: { emailOutbox: { findUnique: mocks.emailFindUnique }, $transaction: mocks.transaction } }));

import { PATCH } from "./route";

function request() {
  return new Request("https://app.example/api/admin/email-outbox/e1", { method: "PATCH" });
}

describe("PATCH /api/admin/email-outbox/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({ emailOutbox: { update: mocks.emailUpdate }, auditLog: { create: mocks.auditCreate } }));
    mocks.emailUpdate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
  });

  it("denies users without platform admin role", async () => {
    mocks.getPlatformAdmin.mockResolvedValue(null);
    const response = await PATCH(request(), { params: Promise.resolve({ id: "e1" }) });
    expect(response.status).toBe(403);
    expect(mocks.emailFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown e-mail", async () => {
    mocks.getPlatformAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.emailFindUnique.mockResolvedValue(null);
    const response = await PATCH(request(), { params: Promise.resolve({ id: "e1" }) });
    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not requeue an e-mail that was already sent", async () => {
    mocks.getPlatformAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.emailFindUnique.mockResolvedValue({ id: "e1", companyId: "c1", status: "SENT", subject: "Assunto" });
    const response = await PATCH(request(), { params: Promise.resolve({ id: "e1" }) });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requeues a failed e-mail and records an audit event", async () => {
    mocks.getPlatformAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.emailFindUnique.mockResolvedValue({ id: "e1", companyId: "c1", status: "FAILED", subject: "Assunto" });
    const response = await PATCH(request(), { params: Promise.resolve({ id: "e1" }) });
    expect(response.status).toBe(200);
    expect(mocks.emailUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "e1" }, data: expect.objectContaining({ status: "PENDING", attempts: 0, lastError: null }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "platform.email_requeued", entityId: "e1" }) }));
  });
});
