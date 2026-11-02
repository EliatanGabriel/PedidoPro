type ApiErrorPayload = { error?: unknown };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function apiRequest<T>(input: RequestInfo | URL, init: RequestInit, fallbackMessage: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, init);
    const payload: unknown = await response.json().catch(() => null);
    const error = payload && typeof payload === "object" && "error" in payload
      ? (payload as ApiErrorPayload).error
      : null;
    if (!response.ok) return { ok: false, error: typeof error === "string" ? error : fallbackMessage };
    if (payload === null) return { ok: false, error: "O servidor retornou uma resposta inválida." };
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, error: "Falha de conexão. Verifique sua internet e tente novamente." };
  }
}
