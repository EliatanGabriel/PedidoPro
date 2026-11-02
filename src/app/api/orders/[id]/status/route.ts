import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { canTransitionOrder, type OrderState } from "@/lib/order-rules";

const schema = z.object({ status: z.enum(["AWAITING_PAYMENT", "PAYMENT_APPROVED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"]) });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "update_order_status")) return Response.json({ error: "Sem permissão para atualizar pedidos." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Status inválido." }, { status: 400 });
  const { id } = await params;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({ where: { id, companyId: context.company.id }, include: { items: true, delivery: true } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      if (!canTransitionOrder(current.status as OrderState, parsed.data.status as OrderState)) throw new Error("INVALID_TRANSITION");
      if (parsed.data.status === "CANCELED") {
        const grouped = new Map<string, number>();
        for (const item of current.items) if (item.productId) grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
        for (const [productId, quantity] of grouped) {
          await tx.product.updateMany({ where: { id: productId, companyId: context.company.id }, data: { stock: { increment: quantity } } });
          await tx.stockMovement.create({ data: { companyId: context.company.id, productId, orderId: current.id, type: "RETURN", quantity, note: `Cancelamento do pedido #${current.number}` } });
        }
      }
      const updated = await tx.order.update({ where: { id: current.id }, data: { status: parsed.data.status }, include: { items: true } });
      const deliveryStatus: Partial<Record<string, "PREPARING" | "READY_FOR_PICKUP" | "IN_TRANSIT" | "DELIVERED" | "FAILED">> = { PREPARING: "PREPARING", READY_FOR_PICKUP: "READY_FOR_PICKUP", OUT_FOR_DELIVERY: "IN_TRANSIT", COMPLETED: "DELIVERED", CANCELED: "FAILED" };
      const nextDeliveryStatus = deliveryStatus[parsed.data.status];
      if (current.delivery && nextDeliveryStatus) await tx.delivery.update({ where: { id: current.delivery.id }, data: { status: nextDeliveryStatus, ...(nextDeliveryStatus === "DELIVERED" ? { completedAt: new Date() } : {}) } });
      await tx.orderStatusHistory.create({ data: { orderId: current.id, from: current.status, to: parsed.data.status, actorId: context.user.id } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "order.status_changed", entity: "Order", entityId: current.id, metadata: { from: current.status, to: parsed.data.status } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return Response.json({ order });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    return Response.json({ error: reason === "ORDER_NOT_FOUND" ? "Pedido não encontrado." : "Transição de status inválida." }, { status: reason === "ORDER_NOT_FOUND" ? 404 : 409 });
  }
}
