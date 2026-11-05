import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  sendEmail: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { emailOutbox: { findMany: mocks.findMany, update: mocks.update, create: mocks.create, deleteMany: mocks.deleteMany } },
}));
vi.mock("@/lib/email", () => ({ authEmailConfigured: true, sendEmail: mocks.sendEmail }));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.logError } }));

import { enqueueEmail, processEmailOutbox } from "./email-outbox";

const pending = { id: "mail-1", to: "cliente@example.com", subject: "Assunto", text: "Texto", html: "<p>Texto</p>", attempts: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  mocks.update.mockResolvedValue({});
  mocks.deleteMany.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fila de e-mails", () => {
  it("envia e marca como SENT", async () => {
    mocks.findMany.mockResolvedValue([pending]);
    mocks.sendEmail.mockResolvedValue(undefined);

    await expect(processEmailOutbox()).resolves.toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(mocks.sendEmail).toHaveBeenCalledWith({ to: pending.to, subject: pending.subject, text: pending.text, html: pending.html });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: pending.id }, data: { status: "SENT", lastError: null } });
  });

  it("reagenda falhas e encerra após cinco tentativas", async () => {
    mocks.findMany.mockResolvedValue([{ ...pending, attempts: 4 }]);
    mocks.sendEmail.mockRejectedValue(new Error("provedor indisponível"));

    await expect(processEmailOutbox()).resolves.toEqual({ processed: 1, sent: 0, failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: pending.id },
      data: expect.objectContaining({ attempts: 5, status: "FAILED", lastError: "provedor indisponível" }),
    }));
  });

  it("mantém como PENDING quando ainda há tentativas", async () => {
    mocks.findMany.mockResolvedValue([pending]);
    mocks.sendEmail.mockRejectedValue(new Error("falha temporária"));

    await processEmailOutbox();
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ attempts: 1, status: "PENDING" }),
    }));
  });

  it("ignora destinatário vazio e grava a empresa no enfileiramento", async () => {
    const db = { emailOutbox: { create: mocks.create } };
    await enqueueEmail(db as never, { to: "   ", subject: "s", text: "t", html: "h" });
    expect(mocks.create).not.toHaveBeenCalled();

    await enqueueEmail(db as never, { to: "cliente@example.com", subject: "s", text: "t", html: "h", companyId: "company-a" });
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ to: "cliente@example.com", companyId: "company-a" }) });
  });
});
