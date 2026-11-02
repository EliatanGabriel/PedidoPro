import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.mercadopago.com";
export const mercadoPagoConfigured = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN && process.env.MERCADO_PAGO_WEBHOOK_SECRET);

export function validMercadoPagoSignature(signature: string | null, requestId: string | null, dataId: string | null, secret: string) {
  if (!signature || !requestId || !dataId) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  if (!parts.ts || !parts.v1 || !/^[a-f\d]{64}$/i.test(parts.v1)) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const actual = Buffer.from(parts.v1, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não está configurado.");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Mercado Pago API error", response.status, body.slice(0, 500));
    throw new Error("Falha ao consultar o provedor de cobrança.");
  }
  return response.json() as Promise<T>;
}
