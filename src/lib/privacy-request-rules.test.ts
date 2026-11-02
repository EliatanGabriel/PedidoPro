import { describe, expect, it } from "vitest";
import { canTransitionPrivacyRequest, customerIsAnonymized } from "./privacy-request-rules";

describe("privacy request workflow", () => {
  it("allows only forward transitions and terminal resolution", () => {
    expect(canTransitionPrivacyRequest("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionPrivacyRequest("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionPrivacyRequest("OPEN", "COMPLETED")).toBe(false);
    expect(canTransitionPrivacyRequest("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("requires personal fields to be absent before recording anonymization as completed", () => {
    const base = { name: "Cliente anonimizado 123abc", phone: null, email: null, taxId: null, address: null, city: null, state: null, postalCode: null, notes: null };
    expect(customerIsAnonymized(base)).toBe(true);
    expect(customerIsAnonymized({ ...base, email: "cliente@example.com" })).toBe(false);
    expect(customerIsAnonymized({ ...base, name: "Cliente original" })).toBe(false);
  });
});
