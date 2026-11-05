import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { enqueueOrderStatusNotification } from "@/lib/notifications";
import { processEmailOutbox } from "@/lib/email-outbox";
import { logger } from "@/lib/logger";

const schema = z.object({ amountCents: z.number().int().positive().max(2_147_483_647), method: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]), transactionReference: z.string().trim().max(120).optional(), notes: z.string().trim().max(500).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_payments")) return Response.json({ error: "Sem permissão para registrar pagamentos." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise o valor e a forma de pagamento." }, { status: 400 });
  const { id } = await params;

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, companyId: context.company.id },
        include: { payments: { where: { status: "PAID" } }, customer: { select: { email: true } }, company: { select: { name: true } } },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (order.status === "CANCELED") throw new Error("ORDER_CANCELED");
      const received = order.payments.reduce((sum, item) => sum + item.amountCents, 0);
      if (received + parsed.data.amountCents > order.totalCents) throw new Error("OVERPAYMENT");
      const created = await tx.payment.create({ data: { ...parsed.data, orderId: order.id, status: "PAID", paidAt: new Date() } });
      const newReceived = received + created.amountCents;
      const nextStatus = newReceived === order.totalCents ? "PAID" : "PARTIALLY_PAID";
      const approvesOrder = newReceived === order.totalCents && ["NEW", "AWAITING_PAYMENT"].includes(order.status);
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: nextStatus, paymentMethod: created.method, ...(approvesOrder ? { status: "PAYMENT_APPROVED" } : {}) } });
      if (approvesOrder) {
        await tx.orderStatusHistory.create({ data: { orderId: order.id, from: order.status, to: "PAYMENT_APPROVED", actorId: context.user.id } });
        await enqueueOrderStatusNotification(tx, {
          companyId: context.company.id,
          customerEmail: order.customer?.email ?? null,
          companyName: order.company.name,
          orderNumber: order.number,
          status: "PAYMENT_APPROVED",
          publicToken: order.publicToken,
        });
      }
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "payment.received", entity: "Payment", entityId: created.id, metadata: { orderId: order.id, amountCents: created.amountCents } } });
      return created;
    }, { isolationLevel: "Serializable" });
    after(() => processEmailOutbox(10).catch((error) => logger.error("email.outbox_processing_failed", error)));
    return Response.json({ payment }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const errors: Record<string, string> = { ORDER_NOT_FOUND: "Pedido não encontrado.", ORDER_CANCELED: "Não é possível receber pagamento de um pedido cancelado.", OVERPAYMENT: "O valor excede o saldo restante do pedido." };
    return Response.json({ error: errors[reason] ?? "Não foi possível registrar o pagamento." }, { status: reason ? 409 : 400 });
  }
}
