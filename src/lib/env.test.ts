import { describe, expect, it } from "vitest";
import { inspectEnv, validateEnv } from "@/lib/env";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/ordexa",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "https://app.ordexa.com",
  NEXT_PUBLIC_APP_URL: "https://app.ordexa.com",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Ordexa <contato@ordexa.com>",
  TRUST_PROXY: "true",
};

describe("inspectEnv", () => {
  it("não aponta problemas com configuração completa de produção", () => {
    expect(inspectEnv(productionEnv).filter((issue) => issue.severity === "error")).toHaveLength(0);
  });

  it("trata segredo curto como erro em produção", () => {
    const issues = inspectEnv({ ...productionEnv, BETTER_AUTH_SECRET: "curto" });
    expect(issues).toContainEqual(expect.objectContaining({ key: "BETTER_AUTH_SECRET", severity: "error" }));
  });

  it("avisa quando e-mail está parcialmente configurado", () => {
    const issues = inspectEnv({ ...productionEnv, EMAIL_FROM: undefined });
    expect(issues).toContainEqual(expect.objectContaining({ key: "RESEND_API_KEY", severity: "warning" }));
  });

  it("avisa sobre HTTP e proxy não confiável em produção", () => {
    const issues = inspectEnv({ ...productionEnv, NEXT_PUBLIC_APP_URL: "http://app.ordexa.com", TRUST_PROXY: undefined });
    const keys = issues.filter((issue) => issue.severity === "warning").map((issue) => issue.key);
    expect(keys).toEqual(expect.arrayContaining(["NEXT_PUBLIC_APP_URL", "TRUST_PROXY"]));
  });
});

describe("validateEnv", () => {
  it("lança erro em modo estrito quando há variável obrigatória ausente", () => {
    expect(() => validateEnv({ env: { ...productionEnv, DATABASE_URL: undefined }, strict: true })).toThrow(/DATABASE_URL/);
  });

  it("não lança fora do modo estrito", () => {
    expect(() => validateEnv({ env: { ...productionEnv, DATABASE_URL: undefined }, strict: false })).not.toThrow();
  });
});
