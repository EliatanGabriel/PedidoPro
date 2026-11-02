import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("client API request handling", () => {
  it("returns parsed data for successful JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ item: "saved" })));

    await expect(apiRequest<{ item: string }>("/api/example", {}, "Falha ao salvar.")).resolves.toEqual({ ok: true, data: { item: "saved" } });
  });

  it("surfaces server validation errors and a safe fallback for malformed errors", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "Campo inválido." }, { status: 400 }))
      .mockResolvedValueOnce(new Response("indisponível", { status: 503 })));

    await expect(apiRequest("/api/example", {}, "Falha ao salvar.")).resolves.toEqual({ ok: false, error: "Campo inválido." });
    await expect(apiRequest("/api/example", {}, "Falha ao salvar.")).resolves.toEqual({ ok: false, error: "Falha ao salvar." });
  });

  it("converts network failures into a visible result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    await expect(apiRequest("/api/example", {}, "Falha ao salvar.")).resolves.toEqual({ ok: false, error: "Falha de conexão. Verifique sua internet e tente novamente." });
  });
});
