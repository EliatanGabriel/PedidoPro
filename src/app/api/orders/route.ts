import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { calculateOrderTotals } from "@/lib/order-rules";
import { subscriptionIsActive } from "@/lib/plans";
import { brazilStartOfMonth } from "@/lib/format";
import { reserveStock } from "@/lib/inventory";
import { enqueueNewOrderNotification, ownerEmailForCompany } from "@/lib/notifications";
import { processEmailOutbox } from "@/lib/email-outbox";
import { logger } from "@/lib/logger";

const orderSchema = z.object({ customerId: z.string().cuid().optional(), recipientName: z.string().trim().max(120).optional(), recipientPhone: z.string().trim().max(30).optional(), paymentMethod: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]).optional(), fulfillment: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"), discountCents: z.number().int().nonnegative().max(2_147_483_647).default(0), deliveryCents: z.number().int().nonnegative().max(2_147_483_647).default(0), deliveryAddress: z.string().trim().max(300).optional(), notes: z.string().trim().max(1000).optional(), items: z.array(z.object({ productId: z.string().cuid(), quantity: z.number().int().positive().max(999) })).min(1).max(50) });

export async function GET(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "view_orders")) return Response.json({ error: "Sem permissão para consultar pedidos." }, { status: 403 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const validStatuses = ["NEW", "AWAITING_PAYMENT", "PAYMENT_APPROVED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"];
  if (status && !validStatuses.includes(status)) return Response.json({ error: "Filtro de status inválido." }, { status: 400 });
  const orders = await prisma.order.findMany({ where: { companyId: context.company.id, ...(status ? { status: status as never } : {}) }, include: { customer: { select: { name: true, phone: true } }, items: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return Response.json({ orders });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "create_orders")) return Response.json({ error: "Sem permissão para criar pedidos." }, { status: 403 });
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados do pedido." }, { status: 400 });
  const data = parsed.data;
  if (data.customerId && !can(context, "manage_customers")) return Response.json({ error: "Sem permissão para associar clientes cadastrados a este pedido." }, { status: 403 });
  if (data.discountCents > 0 && !can(context, "manage_discounts")) return Response.json({ error: "Você não tem permissão para conceder desconto." }, { status: 403 });
  if (data.fulfillment === "DELIVERY" && !data.deliveryAddress?.trim()) return Response.json({ error: "Informe o endereço de entrega." }, { status: 400 });

  try {
    const order = await prisma.$transaction(async (tx) => {
      const plan = await tx.subscription.findUnique({ where: { companyId: context.company.id }, include: { plan: true } });
      if (plan && !subscriptionIsActive(plan)) throw new Error("SUBSCRIPTION_INACTIVE");
      const monthStart = brazilStartOfMonth();
      const monthlyOrders = await tx.order.count({ where: { companyId: context.company.id, createdAt: { gte: monthStart } } });
      if (plan && plan.plan.monthlyOrderLimit > 0 && monthlyOrders >= plan.plan.monthlyOrderLimit) throw new Error("PLAN_ORDER_LIMIT");
      if (data.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: data.customerId, companyId: context.company.id } });
        if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      }
      const ids = [...new Set(data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, companyId: context.company.id, isActive: true } });
      if (products.length !== ids.length) throw new Error("PRODUCT_NOT_FOUND");
      const quantities = new Map<string, number>();
      for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      const productMap = new Map(products.map((product) => [product.id, product]));
      const totals = calculateOrderTotals(data.items.map((item) => ({ unitPriceCents: productMap.get(item.productId)!.priceCents, quantity: item.quantity })), data.discountCents, data.deliveryCents);
      const { subtotalCents, totalCents } = totals;
      const counter = await tx.order.aggregate({ where: { companyId: context.company.id }, _max: { number: true } });
      const number = (counter._max.number ?? 0) + 1;

      for (const [productId, quantity] of quantities) {
        const reserved = await reserveStock(tx, { companyId: context.company.id, productId, quantity, allowNegativeStock: context.company.allowNegativeStock });
        if (!reserved) throw new Error("INSUFFICIENT_STOCK");
      }
      const created = await tx.order.create({ data: {
        companyId: context.company.id, number, customerId: data.customerId, paymentMethod: data.paymentMethod,
        fulfillment: data.fulfillment, recipientName: data.recipientName || undefined, recipientPhone: data.recipientPhone || undefined, subtotalCents, discountCents: data.discountCents, deliveryCents: data.deliveryCents, totalCents,
        deliveryAddress: data.deliveryAddress, notes: data.notes,
        items: { create: data.items.map((item) => { const product = productMap.get(item.productId)!; return { productId: product.id, productName: product.name, quantity: item.quantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * item.quantity, unitCostCents: product.costCents }; }) },
        statusHistory: { create: { to: "NEW", actorId: context.user.id } },
        ...(data.fulfillment === "DELIVERY" ? { delivery: { create: { address: data.deliveryAddress, recipientName: data.recipientName || undefined, recipientPhone: data.recipientPhone || undefined, feeCents: data.deliveryCents } } } : {}),
      }, include: { items: true, customer: true } });
      for (const [productId, quantity] of quantities) await tx.stockMovement.create({ data: { companyId: context.company.id, productId, orderId: created.id, type: "SALE", quantity: -quantity, note: `Pedido #${number}` } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "order.created", entity: "Order", entityId: created.id, metadata: { number, totalCents } } });
      const ownerEmail = await ownerEmailForCompany(tx, context.company.id);
      await enqueueNewOrderNotification(tx, {
        companyId: context.company.id,
        merchantEmail: context.company.email || ownerEmail,
        companyName: context.company.name,
        orderNumber: number,
        customerName: created.customer?.name ?? data.recipientName ?? null,
        itemCount: created.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCents,
        orderId: created.id,
      });
      return created;
    }, { isolationLevel: "Serializable" });
    after(() => processEmailOutbox(10).catch((error) => logger.error("email.outbox_processing_failed", error)));
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = { CUSTOMER_NOT_FOUND: "Cliente não encontrado nesta empresa.", PRODUCT_NOT_FOUND: "Um ou mais produtos não estão disponíveis.", DISCOUNT_TOO_HIGH: "O desconto não pode superar o subtotal.", TOTAL_OUT_OF_RANGE: "O total do pedido está acima do limite permitido.", INSUFFICIENT_STOCK: "Estoque insuficiente para um dos produtos.", PLAN_ORDER_LIMIT: "Limite mensal de pedidos atingido. Consulte sua assinatura.", SUBSCRIPTION_INACTIVE: "A assinatura da empresa não está ativa." };
    return Response.json({ error: messages[reason] ?? "Não foi possível criar o pedido." }, { status: reason ? 409 : 400 });
  }
}
