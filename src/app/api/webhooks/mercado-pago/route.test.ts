import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mercadoPagoRequest: vi.fn(),
  eventCreate: vi.fn(),
  transaction: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  planFindFirst: vi.fn(),
  subscriptionUpdate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {
  providerWebhookEvent: { create: mocks.eventCreate },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/mercado-pago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mercado-pago")>();
  return { ...actual, mercadoPagoRequest: mocks.mercadoPagoRequest };
});

import { POST } from "./route";

const secret = "webhook-test-secret";

function signedRequest(dataId: string, body: Record<string, unknown>, query = "") {
  const requestId = "request-id-1";
  const timestamp = "1700000000";
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const signature = createHmac("sha256", secret).update(manifest).digest("hex");
  const suffix = query ? `&${query}` : "";
  return new Request(`https://app.example/api/webhooks/mercado-pago?data.id=${encodeURIComponent(dataId)}${suffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${timestamp},v1=${signature}` },
    body: JSON.stringify(body),
  });
}

describe("Mercado Pago webhook resource binding", () => {
  beforeEach(() => {
    vi.stubEnv("MERCADO_PAGO_WEBHOOK_SECRET", secret);
    vi.clearAllMocks();
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementation((callback) => callback({
      providerWebhookEvent: { create: mocks.eventCreate },
      subscription: { findFirst: mocks.subscriptionFindFirst, update: mocks.subscriptionUpdate },
      plan: { findFirst: mocks.planFindFirst },
      auditLog: { create: mocks.auditCreate },
    }));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects a body resource ID different from the signed query ID", async () => {
    const response = await POST(signedRequest("resource-123", {
      id: "event-1", type: "subscription_preapproval", data: { id: "resource-999" },
    }));

    expect(response.status).toBe(401);
    expect(mocks.mercadoPagoRequest).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON shapes before reading provider data", async () => {
    const response = await POST(signedRequest("resource-123", null as unknown as Record<string, unknown>));

    expect(response.status).toBe(400);
    expect(mocks.mercadoPagoRequest).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("uses the signed query ID as the provider resource ID", async () => {
    mocks.mercadoPagoRequest.mockResolvedValue({ id: "resource-123", status: "pending" });
    const response = await POST(signedRequest("resource-123", {
      id: "event-1", type: "subscription_preapproval",
    }));

    expect(response.status).toBe(200);
    expect(mocks.mercadoPagoRequest).toHaveBeenCalledWith("/preapproval/resource-123");
    expect(mocks.eventCreate).toHaveBeenCalledWith({ data: { provider: "MERCADO_PAGO", eventId: "event-1", eventType: "subscription_preapproval" } });
  });

  it("does not persist unsupported event types as processed events", async () => {
    const response = await POST(signedRequest("resource-123", {
      id: "event-1", type: "unhandled_event", data: { id: "resource-123" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.eventCreate).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
