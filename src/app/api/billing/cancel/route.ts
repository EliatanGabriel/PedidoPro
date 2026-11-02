import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { mercadoPagoRequest } from "@/lib/mercado-pago";

export async function POST() {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Faça login e configure sua empresa." }, { status: 401 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode cancelar o plano." }, { status: 403 });
  const subscription = await prisma.subscription.findUnique({ where: { companyId: context.company.id } });
  if (!subscription?.providerSubscriptionId || subscription.provider !== "MERCADO_PAGO") return Response.json({ error: "Não há assinatura Mercado Pago para cancelar." }, { status: 404 });
  try {
    const result = await mercadoPagoRequest<{ status: string }>(`/preapproval/${encodeURIComponent(subscription.providerSubscriptionId)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    if (result.status !== "cancelled") return Response.json({ error: "O provedor não confirmou o cancelamento." }, { status: 502 });
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: subscription.id }, data: { status: "CANCELED", pendingPlanId: null, checkoutUrl: null } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "billing.subscription_canceled", entity: "Subscription", entityId: subscription.id, metadata: { provider: "MERCADO_PAGO" } } });
    });
    return Response.json({ canceled: true });
  } catch {
    return Response.json({ error: "Não foi possível confirmar o cancelamento no provedor." }, { status: 502 });
  }
}
