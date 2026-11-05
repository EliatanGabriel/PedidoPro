import { afterEach, describe, expect, it } from "vitest";
import { clientIp } from "@/lib/client-ip";

const original = process.env.TRUST_PROXY;
afterEach(() => {
  if (original === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = original;
});

describe("clientIp", () => {
  it("usa o primeiro IP encaminhado quando o proxy é confiável", () => {
    delete process.env.TRUST_PROXY;
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.10");
  });

  it("ignora cabeçalhos forjados quando o proxy não é confiável", () => {
    process.env.TRUST_PROXY = "false";
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
    expect(clientIp(headers)).toBe("proxy-untrusted");
  });

  it("rejeita valores que não são IPs", () => {
    delete process.env.TRUST_PROXY;
    const headers = new Headers({ "x-forwarded-for": "<script>alert(1)</script>" });
    expect(clientIp(headers)).toBe("unknown");
  });
});
