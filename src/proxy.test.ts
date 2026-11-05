import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const originalAuthUrl = process.env.BETTER_AUTH_URL;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  if (originalAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = originalAuthUrl;
});

describe("API request origin proxy", () => {
  it("rejects cross-origin API mutations", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    const request = new NextRequest("https://app.example/api/orders", { method: "POST", headers: { origin: "https://attacker.example" } });
    const response = proxy(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Origem da solicitação não autorizada." });
  });

  it("allows same-origin mutations and read-only requests", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example";
    const post = proxy(new NextRequest("https://app.example/api/orders", { method: "POST", headers: { origin: "https://app.example" } }));
    expect(post.headers.get("x-middleware-next")).toBe("1");
    const get = proxy(new NextRequest("https://app.example/api/orders"));
    expect(get.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves authenticated provider callbacks to their own signature checks", () => {
    const webhook = proxy(new NextRequest("https://app.example/api/webhooks/mercado-pago", { method: "POST" }));
    expect(webhook.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves the cron endpoint to its bearer token check", () => {
    const cron = proxy(new NextRequest("https://app.example/api/cron/email-outbox", { method: "POST" }));
    expect(cron.headers.get("x-middleware-next")).toBe("1");
  });
});
