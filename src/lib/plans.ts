import { prisma } from "@/lib/prisma";
import { subscriptionIsActive } from "@/lib/plan-rules";
export { subscriptionIsActive } from "@/lib/plan-rules";

export type PlanFeature = "reports" | "advanced_reports" | "expenses" | "stock" | "public_store";

export async function hasPlanFeature(companyId: string, feature: PlanFeature) {
  const subscription = await prisma.subscription.findUnique({ where: { companyId }, include: { plan: true } });
  if (!subscription || !subscriptionIsActive(subscription)) return false;
  return Array.isArray(subscription.plan.features) && subscription.plan.features.includes(feature);
}
