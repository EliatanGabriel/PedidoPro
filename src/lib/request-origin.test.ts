import { describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "./request-origin";

describe("same-origin request protection", () => {
  it("accepts only configured origins", () => {
    expect(isTrustedMutationOrigin("https://app.example.com", ["https://app.example.com"])).toBe(true);
    expect(isTrustedMutationOrigin("https://evil.example", ["https://app.example.com"])).toBe(false);
    expect(isTrustedMutationOrigin(null, ["https://app.example.com"])).toBe(false);
    expect(isTrustedMutationOrigin("not-an-origin", ["https://app.example.com"])).toBe(false);
  });

  it("compares origins and ignores URL paths", () => {
    expect(isTrustedMutationOrigin("https://app.example.com", ["https://app.example.com/painel"])).toBe(true);
    expect(isTrustedMutationOrigin("http://app.example.com", ["https://app.example.com"])).toBe(false);
  });
});
