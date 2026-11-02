import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mercadoPagoRequest, validMercadoPagoSignature } from "@/lib/mercado-pago";

const identifierSchema = z.union([z.string().trim().min(1).max(100), z.number().int().nonnegative()]);
const noticeSchema = z.object({
  id: identifierSchema.optional(),
  type: z.string().trim().min(1).max(120).optional(),
  action: z.string().trim().max(120).optional(),
  data: z.object({ id: identifierSchema.optional() }).passthrough().optional(),
}).passthrough();
type Preapproval = { id: string; status: string; external_reference?: string; next_payment_date?: string };
type AuthorizedPayment = { id: string | number; preapproval_id?: string; status: string; transaction_amount: number; date_approved?: string };

export async function POST(request: Request) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook não configurado." }, { status: 503 });
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (!validMercadoPagoSignature(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId, secret)) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let rawNotice: unknown;
  try { rawNotice = await request.json(); } catch { return Response.json({ error: "Notificação inválida." }, { status: 400 }); }
  const parsedNotice = noticeSchema.safeParse(rawNotice);
  if (!parsedNotice.success) return Response.json({ error: "Notificação inválida." }, { status: 400 });
  const notice = parsedNotice.data;
  const eventId = String(notice.id ?? "");
  const bodyResourceId = notice.data?.id === undefined ? null : String(notice.data.id);
  if (bodyResourceId !== null && bodyResourceId.toLowerCase() !== dataId?.toLowerCase()) {
    return Response.json({ error: "Identificador da notificação não corresponde à assinatura." }, { status: 401 });
  }
  const resourceId = dataId ?? "";
  const queryEventType = url.searchParams.get("type") ?? url.searchParams.get("topic");
  if (notice.type && queryEventType && notice.type !== queryEventType) return Response.json({ error: "Tipo da notificação inconsistente." }, { status: 400 });
  const eventType = notice.type ?? queryEventType ?? "";
  if (!eventId || !resourceId || !eventType) return Response.json({ error: "Notificação incompleta." }, { status: 400 });

  if (eventType !== "subscription_preapproval" && eventType !== "subscription_authorized_payment") {
    return Response.json({ received: true, ignored: true });
  }

  try {
    let preapproval: Preapproval | null = null;
    let payment: AuthorizedPayment | null = null;
    let paymentPreapproval: Preapproval | null = null;
    if (eventType === "subscription_preapproval") {
      preapproval = await mercadoPagoRequest<Preapproval>(`/preapproval/${encodeURIComponent(resourceId)}`);
      if (preapproval.id !== resourceId) throw new Error("Mercado Pago resource ID mismatch");
    } else if (eventType === "subscription_authorized_payment") {
      payment = await mercadoPagoRequest<AuthorizedPayment>(`/authorized_payments/${encodeURIComponent(resourceId)}`);
      if (String(payment.id) !== resourceId) throw new Error("Mercado Pago resource ID mismatch");
      if (payment.preapproval_id) {
        paymentPreapproval = await mercadoPagoRequest<Preapproval>(`/preapproval/${encodeURIComponent(payment.preapproval_id)}`);
        if (paymentPreapproval.id !== payment.preapproval_id) throw new Error("Mercado Pago subscription ID mismatch");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.providerWebhookEvent.create({ data: { provider: "MERCADO_PAGO", eventId, eventType } });
      if (preapproval) {
        const status = preapproval.status === "authorized" ? "ACTIVE" : preapproval.status === "cancelled" ? "CANCELED" : preapproval.status === "paused" ? "PAST_DUE" : null;
        if (!status) return;
        const [companyId, externalPlanId] = (preapproval.external_reference ?? "").split(":");
        const current = await tx.subscription.findFirst({ where: { provider: "MERCADO_PAGO", providerSubscriptionId: preapproval.id } });
        if (!current) return;
        const plan = status === "ACTIVE" && companyId === current.companyId && current.pendingPlanId === externalPlanId
          ? await tx.plan.findFirst({ where: { id: current.pendingPlanId, isActive: true } })
          : null;
        if (status === "ACTIVE" && !plan) return;
        await tx.subscription.update({ where: { id: current.id }, data: {
          status,
          ...(plan ? { planId: plan.id, trialEndsAt: null, pendingPlanId: null, checkoutUrl: null } : {}),
          ...(status === "CANCELED" ? { pendingPlanId: null, checkoutUrl: null } : {}),
          ...(preapproval.next_payment_date ? { currentPeriodEndsAt: new Date(preapproval.next_payment_date) } : {}),
        } });
        await tx.auditLog.create({ data: { companyId: current.companyId, action: "billing.subscription_updated", entity: "Subscription", entityId: current.id, metadata: { provider: "MERCADO_PAGO", status } } });
      }
      if (payment?.preapproval_id) {
        const current = await tx.subscription.findFirst({ where: { provider: "MERCADO_PAGO", providerSubscriptionId: payment.preapproval_id } });
        if (!current) return;
        const amountCents = Math.round(payment.transaction_amount * 100);
        if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error("Invalid payment amount");
        await tx.subscriptionInvoice.upsert({
          where: { providerPaymentId: String(payment.id) },
          create: { subscriptionId: current.id, providerPaymentId: String(payment.id), amountCents, status: payment.status, paidAt: payment.status === "approved" && payment.date_approved ? new Date(payment.date_approved) : null },
          update: { amountCents, status: payment.status, paidAt: payment.status === "approved" && payment.date_approved ? new Date(payment.date_approved) : null },
        });
        if (payment.status === "rejected") await tx.subscription.update({ where: { id: current.id }, data: { status: "PAST_DUE" } });
        if (payment.status === "approved" && paymentPreapproval?.status === "authorized") {
          const [companyId, externalPlanId] = (paymentPreapproval.external_reference ?? "").split(":");
          const plan = companyId === current.companyId && current.pendingPlanId === externalPlanId
            ? await tx.plan.findFirst({ where: { id: current.pendingPlanId, isActive: true } })
            : null;
          await tx.subscription.update({ where: { id: current.id }, data: {
            status: "ACTIVE",
            ...(paymentPreapproval.next_payment_date ? { currentPeriodEndsAt: new Date(paymentPreapproval.next_payment_date) } : {}),
            ...(plan ? { planId: plan.id, trialEndsAt: null, pendingPlanId: null, checkoutUrl: null } : {}),
          } });
        }
      }
    });
    return Response.json({ received: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") return Response.json({ received: true, duplicate: true });
    console.error("Mercado Pago webhook could not be processed.", error);
    return Response.json({ error: "Notificação não processada." }, { status: 502 });
  }
}
