import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { canTransitionDelivery, canTransitionOrder, type DeliveryState, type OrderState } from "@/lib/order-rules";

const schema = z.object({ status: z.enum(["AWAITING_PICKUP", "PREPARING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "FAILED"]), expectedAt: z.iso.datetime().nullable().optional(), notes: z.string().trim().max(500).optional() });
const orderStatus: Partial<Record<string, OrderState>> = { PREPARING: "PREPARING", READY_FOR_PICKUP: "READY_FOR_PICKUP", IN_TRANSIT: "OUT_FOR_DELIVERY", DELIVERED: "COMPLETED" };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_deliveries")) return Response.json({ error: "Sem permissão para atualizar entregas." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Confira o status e a previsão da entrega." }, { status: 400 });
  const { id } = await params;

  try {
    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id, companyId: context.company.id }, include: { delivery: true } });
      if (!order || !order.delivery) throw new Error("DELIVERY_NOT_FOUND");
      if (!canTransitionDelivery(order.delivery.status as DeliveryState, parsed.data.status as DeliveryState)) throw new Error("INVALID_DELIVERY_TRANSITION");
      const nextOrderStatus = orderStatus[parsed.data.status];
      if (nextOrderStatus && order.status !== nextOrderStatus && !canTransitionOrder(order.status as OrderState, nextOrderStatus)) throw new Error("INVALID_TRANSITION");
      const updated = await tx.delivery.update({ where: { id: order.delivery.id }, data: { status: parsed.data.status, expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : null, notes: parsed.data.notes || null, ...(parsed.data.status === "DELIVERED" ? { completedAt: new Date() } : {}) } });
      if (nextOrderStatus && order.status !== nextOrderStatus) {
        await tx.order.update({ where: { id: order.id }, data: { status: nextOrderStatus } });
        await tx.orderStatusHistory.create({ data: { orderId: order.id, from: order.status, to: nextOrderStatus, actorId: context.user.id } });
      }
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "delivery.updated", entity: "Delivery", entityId: updated.id, metadata: { status: updated.status, orderId: order.id } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return Response.json({ delivery });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const message = reason === "DELIVERY_NOT_FOUND" ? "Entrega não encontrada." : reason === "INVALID_DELIVERY_TRANSITION" ? "Esta transição não é válida para o status atual da entrega." : "Esta transição não é válida para o status atual do pedido.";
    return Response.json({ error: message }, { status: reason === "DELIVERY_NOT_FOUND" ? 404 : 409 });
  }
}
