export function subscriptionIsActive(subscription: { status: string; trialEndsAt: Date | null; currentPeriodEndsAt?: Date | null }) {
  if (subscription.status === "CANCELED" || subscription.status === "PAST_DUE") return false;
  if (subscription.status === "TRIALING") return Boolean(subscription.trialEndsAt && subscription.trialEndsAt > new Date());
  if (subscription.status === "ACTIVE" && subscription.currentPeriodEndsAt) return subscription.currentPeriodEndsAt > new Date();
  return subscription.status === "ACTIVE";
}
