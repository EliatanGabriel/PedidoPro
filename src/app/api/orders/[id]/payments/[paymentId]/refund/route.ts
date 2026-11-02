import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { derivePaymentStatus } from "@/lib/order-rules";

const schema = z.object({
  reason: z.string().trim().min(3).max(500),
  reference: z.string().trim().max(120).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_payments")) return Response.json({ error: "Sem permissão para registrar estornos." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Informe o motivo do estorno e confira a referência." }, { status: 400 });
  const { id, paymentId } = await params;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, companyId: context.company.id }, include: { payments: true } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      const target = order.payments.find((item) => item.id === paymentId);
      if (!target) throw new Error("PAYMENT_NOT_FOUND");
      if (target.status !== "PAID") throw new Error("PAYMENT_NOT_REFUNDABLE");

      const refunded = await tx.payment.update({
        where: { id: target.id },
        data: { status: "REFUNDED", refundedAt: new Date(), refundReason: parsed.data.reason, refundReference: parsed.data.reference || null },
      });
      const paymentStatus = derivePaymentStatus(order.totalCents, order.payments.map((item) => ({ amountCents: item.amountCents, status: item.id === target.id ? "REFUNDED" : item.status })));
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "payment.refunded_manually", entity: "Payment", entityId: refunded.id, metadata: { orderId: order.id, amountCents: refunded.amountCents } } });
      return refunded;
    }, { isolationLevel: "Serializable" });
    return Response.json({ payment });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = {
      ORDER_NOT_FOUND: "Pedido não encontrado.", PAYMENT_NOT_FOUND: "Pagamento não encontrado neste pedido.",
      PAYMENT_NOT_REFUNDABLE: "Somente pagamentos registrados como pagos podem ser estornados.",
    };
    return Response.json({ error: errors[reason] ?? "Não foi possível registrar o estorno." }, { status: reason.endsWith("NOT_FOUND") ? 404 : reason ? 409 : 400 });
  }
}
