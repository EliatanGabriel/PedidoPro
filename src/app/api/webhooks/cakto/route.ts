import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headerList = await headers();
  const signature = headerList.get("x-cakto-signature");
  if (!signature) return Response.json({ error: "Assinatura ausente." }, { status: 401 });

  const body = await request.json();
  const { event, data } = body as { event: string; data: { id?: string; status?: string; external_reference?: string } };

  // Eventos de pagamento aprovado da Cakto
  const paymentApproved = ["payment.approved", "payment.authorized", "offer.paid", "subscription.activated"].includes(event);

  if (!paymentApproved) return Response.json({ received: true });

  const providerSubscriptionId = data?.id || data?.external_reference;
  if (!providerSubscriptionId) return Response.json({ error: "Identificador da assinatura ausente." }, { status: 400 });

  const subscription = await prisma.subscription.findFirst({ where: { providerSubscriptionId, provider: "CAKTO" } });
  if (!subscription) return Response.json({ error: "Assinatura não encontrada." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: subscription.pendingPlanId ? "ACTIVE" : "ACTIVE",
        ...(subscription.pendingPlanId ? { planId: subscription.pendingPlanId, pendingPlanId: null } : {}),
        checkoutUrl: null,
      },
    });
    await tx.auditLog.create({
      data: {
        companyId: subscription.companyId,
        action: "billing.webhook_payment_confirmed",
        entity: "Subscription",
        entityId: subscription.id,
        metadata: { provider: "CAKTO", event, planId: subscription.pendingPlanId ?? null },
      },
    });
  });

  return Response.json({ ok: true });
}
