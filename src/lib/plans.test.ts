import { describe, expect, it } from "vitest";
import { subscriptionIsActive } from "./plan-rules";

describe("subscription access", () => {
  it("allows active subscriptions without a fixed period end", () => {
    expect(subscriptionIsActive({ status: "ACTIVE", trialEndsAt: null })).toBe(true);
  });
  it("expires trials whose end date has passed", () => {
    expect(subscriptionIsActive({ status: "TRIALING", trialEndsAt: new Date(Date.now() - 60_000) })).toBe(false);
    expect(subscriptionIsActive({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 60_000) })).toBe(true);
    expect(subscriptionIsActive({ status: "TRIALING", trialEndsAt: null })).toBe(false);
  });
  it("expires active paid periods and blocks canceled or past-due plans", () => {
    expect(subscriptionIsActive({ status: "ACTIVE", trialEndsAt: null, currentPeriodEndsAt: new Date(Date.now() - 1) })).toBe(false);
    expect(subscriptionIsActive({ status: "CANCELED", trialEndsAt: null })).toBe(false);
    expect(subscriptionIsActive({ status: "PAST_DUE", trialEndsAt: null })).toBe(false);
  });
});
