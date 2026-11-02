import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validMercadoPagoSignature } from "./mercado-pago";
import { isMercadoPagoCheckoutUrl } from "./mercado-pago-url";

describe("Mercado Pago webhook signature", () => {
  it("validates signed notifications and rejects tampering", () => {
    const secret = "test-webhook-secret";
    const id = "12345";
    const requestId = "request-abc";
    const ts = "1700000000";
    const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
    const digest = createHmac("sha256", secret).update(manifest).digest("hex");
    const signature = `ts=${ts},v1=${digest}`;
    expect(validMercadoPagoSignature(signature, requestId, id, secret)).toBe(true);
    expect(validMercadoPagoSignature(signature, requestId, "999", secret)).toBe(false);
    expect(validMercadoPagoSignature(signature, "wrong-request", id, secret)).toBe(false);
    expect(validMercadoPagoSignature(null, requestId, id, secret)).toBe(false);
  });

  it("accepts only HTTPS Mercado Pago checkout origins", () => {
    expect(isMercadoPagoCheckoutUrl("https://www.mercadopago.com.br/subscriptions/checkout" )).toBe(true);
    expect(isMercadoPagoCheckoutUrl("https://sandbox.mercadopago.com.br/subscriptions/checkout" )).toBe(true);
    expect(isMercadoPagoCheckoutUrl("http://www.mercadopago.com.br" )).toBe(false);
    expect(isMercadoPagoCheckoutUrl("https://mercadopago.com.br.attacker.test" )).toBe(false);
  });
});
