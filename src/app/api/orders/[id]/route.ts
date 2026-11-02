import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { calculateOrderTotals } from "@/lib/order-rules";

const schema = z.object({
  customerId: z.string().cuid().nullable().optional(),
  recipientName: z.string().trim().max(120).optional(),
  recipientPhone: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]).nullable().optional(),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  discountCents: z.number().int().nonnegative().max(2_147_483_647),
  deliveryCents: z.number().int().nonnegative().max(2_147_483_647),
  deliveryAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ productId: z.string().cuid(), quantity: z.number().int().positive().max(999) })).min(1).max(50),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "edit_orders")) return Response.json({ error: "Sem permissão para editar pedidos." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados do pedido." }, { status: 400 });
  const data = parsed.data;
  if (data.customerId && !can(context, "manage_customers")) return Response.json({ error: "Sem permissão para associar clientes cadastrados a este pedido." }, { status: 403 });
  if (data.discountCents > 0 && !can(context, "manage_discounts")) return Response.json({ error: "Você não tem permissão para conceder desconto." }, { status: 403 });
  if (data.fulfillment === "DELIVERY" && !data.deliveryAddress?.trim()) return Response.json({ error: "Informe o endereço de entrega." }, { status: 400 });

  const { id } = await params;
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({ where: { id, companyId: context.company.id }, include: { items: true, payments: { where: { status: "PAID" } }, delivery: true } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      if (!["NEW", "AWAITING_PAYMENT"].includes(current.status)) throw new Error("ORDER_NOT_EDITABLE");
      if (data.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: data.customerId, companyId: context.company.id } });
        if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      }

      const oldQuantities = new Map<string, number>();
      for (const item of current.items) if (item.productId) oldQuantities.set(item.productId, (oldQuantities.get(item.productId) ?? 0) + item.quantity);
      const newQuantities = new Map<string, number>();
      for (const item of data.items) newQuantities.set(item.productId, (newQuantities.get(item.productId) ?? 0) + item.quantity);
      const ids = [...new Set([...newQuantities.keys(), ...oldQuantities.keys()])];
      const products = await tx.product.findMany({ where: { id: { in: ids }, companyId: context.company.id } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      if ([...newQuantities.keys()].some((productId) => !productMap.has(productId) || (!productMap.get(productId)!.isActive && !oldQuantities.has(productId)))) throw new Error("PRODUCT_NOT_FOUND");

      const totals = calculateOrderTotals(data.items.map((item) => ({ unitPriceCents: productMap.get(item.productId)!.priceCents, quantity: item.quantity })), data.discountCents, data.deliveryCents);
      const received = current.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      if (totals.totalCents < received) throw new Error("TOTAL_BELOW_PAID");

      // Restore the previous quantities first, then consume the revised quantities in this same transaction.
      for (const [productId, quantity] of oldQuantities) {
        await tx.product.updateMany({ where: { id: productId, companyId: context.company.id }, data: { stock: { increment: quantity } } });
      }
      for (const [productId, quantity] of newQuantities) {
        const result = await tx.product.updateMany({ where: { id: productId, companyId: context.company.id, ...(context.company.allowNegativeStock ? {} : { stock: { gte: quantity } }) }, data: { stock: { decrement: quantity } } });
        if (result.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        const difference = (oldQuantities.get(productId) ?? 0) - quantity;
        if (difference !== 0) await tx.stockMovement.create({ data: { companyId: context.company.id, productId, type: "ADJUSTMENT", quantity: difference, note: `Ajuste da edição do pedido #${current.number}` } });
      }
      for (const [productId, quantity] of oldQuantities) {
        if (!newQuantities.has(productId)) await tx.stockMovement.create({ data: { companyId: context.company.id, productId, type: "ADJUSTMENT", quantity, note: `Devolução por edição do pedido #${current.number}` } });
      }

      await tx.orderItem.deleteMany({ where: { orderId: current.id } });
      const updated = await tx.order.update({
        where: { id: current.id },
        data: {
          customerId: data.customerId || null,
          recipientName: data.recipientName || null,
          recipientPhone: data.recipientPhone || null,
          paymentMethod: data.paymentMethod || null,
          fulfillment: data.fulfillment,
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          deliveryCents: totals.deliveryCents,
          totalCents: totals.totalCents,
          paymentStatus: received === 0 ? "PENDING" : received === totals.totalCents ? "PAID" : "PARTIALLY_PAID",
          deliveryAddress: data.fulfillment === "DELIVERY" ? data.deliveryAddress : null,
          notes: data.notes || null,
          items: { create: data.items.map((item) => { const product = productMap.get(item.productId)!; return { productId: product.id, productName: product.name, quantity: item.quantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * item.quantity, unitCostCents: product.costCents }; }) },
          ...(data.fulfillment === "DELIVERY" ? {
            delivery: current.delivery
              ? { update: { address: data.deliveryAddress, recipientName: data.recipientName || null, recipientPhone: data.recipientPhone || null, feeCents: data.deliveryCents } }
              : { create: { address: data.deliveryAddress, recipientName: data.recipientName || null, recipientPhone: data.recipientPhone || null, feeCents: data.deliveryCents } },
          } : current.delivery ? { delivery: { delete: true } } : {}),
        },
        include: { items: true, customer: true },
      });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "order.updated", entity: "Order", entityId: current.id, metadata: { number: current.number, previousTotalCents: current.totalCents, totalCents: totals.totalCents } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return Response.json({ order });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      ORDER_NOT_FOUND: "Pedido não encontrado.", ORDER_NOT_EDITABLE: "Só é possível editar pedidos novos ou aguardando pagamento.",
      CUSTOMER_NOT_FOUND: "Cliente não encontrado nesta empresa.", PRODUCT_NOT_FOUND: "Um produto selecionado não está mais disponível.",
      INSUFFICIENT_STOCK: "Estoque insuficiente para os itens revisados.", TOTAL_BELOW_PAID: "O total não pode ficar abaixo do valor já recebido.",
      DISCOUNT_TOO_HIGH: "O desconto não pode superar o subtotal.", TOTAL_OUT_OF_RANGE: "O total do pedido está acima do limite permitido.",
    };
    return Response.json({ error: messages[reason] ?? "Não foi possível atualizar o pedido." }, { status: reason === "ORDER_NOT_FOUND" ? 404 : reason ? 409 : 400 });
  }
}
