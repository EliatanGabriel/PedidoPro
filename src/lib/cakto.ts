import { logger } from "@/lib/logger";

const API = "https://api.cakto.com.br/public_api";
export const caktoConfigured = Boolean(
  process.env.CAKTO_CLIENT_ID && process.env.CAKTO_CLIENT_SECRET
);

async function getAccessToken(): Promise<string> {
  const clientId = process.env.CAKTO_CLIENT_ID;
  const clientSecret = process.env.CAKTO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Cakto não está configurado: defina CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET.");
  }
  const response = await fetch(`${API}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
    next: { revalidate: 86400 },
  });
  if (!response.ok) {
    const body = await response.text();
    logger.error("cakto.token_error", undefined, { status: response.status, body: body.slice(0, 500) });
    throw new Error("Falha ao obter token da Cakto.");
  }
  const data = await response.json();
  return data.access_token;
}

export async function caktoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const body = await response.text();
    logger.error("cakto.provider_error", undefined, { status: response.status, body: body.slice(0, 500) });
    throw new Error("Falha ao consultar o provedor de cobrança Cakto.");
  }
  return response.json() as Promise<T>;
}

export function isCaktoCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("cakto.com.br");
  } catch {
    return false;
  }
}