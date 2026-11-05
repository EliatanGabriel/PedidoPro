import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateOrderTotals } from "@/lib/order-rules";
import { hasPlanFeature } from "@/lib/plans";
import { allowPublicOrder } from "@/lib/rate-limit";
import { brazilStartOfMonth } from "@/lib/format";
import { subscriptionIsActive } from "@/lib/plans";
import { reserveStock } from "@/lib/inventory";
import { enqueueNewOrderNotification, ownerEmailForCompany } from "@/lib/notifications";
import { processEmailOutbox } from "@/lib/email-outbox";
import { logger } from "@/lib/logger";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.email().optional().or(z.literal("")),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  paymentMethod: z.enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]),
  address: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ productId: z.string().cuid(), quantity: z.number().int().positive().max(99) })).min(1).max(30),
});

const publicCompanySelect = {
  id: true, name: true, description: true, logoUrl: true, phone: true, email: true, businessHours: true,
  deliveryFeeCents: true, acceptsPickup: true, acceptsDelivery: true, publicPaymentMethods: true, allowNegativeStock: true,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await prisma.company.findUnique({ where: { slug, isActive: true }, select: publicCompanySelect });
  if (!company || !await hasPlanFeature(company.id, "public_store")) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
  const products = await prisma.product.findMany({
    where: { companyId: company.id, isActive: true, ...(company.allowNegativeStock ? {} : { stock: { gt: 0 } }) },
    select: { id: true, name: true, description: true, imageUrl: true, priceCents: true, stock: true, category: { select: { name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
  return Response.json({ company: { ...company, allowNegativeStock: undefined }, products });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!await allowPublicOrder(request, slug)) return Response.json({ error: "Muitas tentativas. Aguarde um minuto antes de enviar outro pedido." }, { status: 429, headers: { "Retry-After": "60" } });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Confira seus dados, a forma de recebimento e os itens do pedido." }, { status: 400 });
  const data = parsed.data;
  if (data.fulfillment === "DELIVERY" && !data.address?.trim()) return Response.json({ error: "Informe o endereço de entrega." }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { slug, isActive: true }, select: publicCompanySelect });
  if (!company || !await hasPlanFeature(company.id, "public_store")) return Response.json({ error: "Loja não encontrada." }, { status: 404 });
  if ((data.fulfillment === "DELIVERY" && !company.acceptsDelivery) || (data.fulfillment === "PICKUP" && !company.acceptsPickup)) return Response.json({ error: "Esta modalidade de recebimento não está disponível." }, { status: 400 });
  const acceptedPaymentMethods = Array.isArray(company.publicPaymentMethods) ? company.publicPaymentMethods.filter((method): method is string => typeof method === "string") : [];
  if (!acceptedPaymentMethods.includes(data.paymentMethod)) return Response.json({ error: "Esta forma de pagamento não está disponível nesta loja." }, { status: 400 });
  const deliveryCents = data.fulfillment === "DELIVERY" ? company.deliveryFeeCents : 0;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({ where: { companyId: company.id }, include: { plan: true } });
      if (subscription && !subscriptionIsActive(subscription)) throw new Error("SUBSCRIPTION_INACTIVE");
      const monthCount = await tx.order.count({ where: { companyId: company.id, createdAt: { gte: brazilStartOfMonth() } } });
      if (subscription && subscription.plan.monthlyOrderLimit > 0 && monthCount >= subscription.plan.monthlyOrderLimit) throw new Error("PLAN_ORDER_LIMIT");
      const ids = [...new Set(data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({ where: { id: { in: ids }, companyId: company.id, isActive: true } });
      if (products.length !== ids.length) throw new Error("PRODUCT_NOT_FOUND");
      const productMap = new Map(products.map((product) => [product.id, product]));
      const quantities = new Map<string, number>();
      for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
      const totals = calculateOrderTotals(data.items.map((item) => ({ unitPriceCents: productMap.get(item.productId)!.priceCents, quantity: item.quantity })), 0, deliveryCents);
      const counter = await tx.order.aggregate({ where: { companyId: company.id }, _max: { number: true } });
      for (const [productId, quantity] of quantities) {
        const reserved = await reserveStock(tx, { companyId: company.id, productId, quantity, allowNegativeStock: company.allowNegativeStock });
        if (!reserved) throw new Error("INSUFFICIENT_STOCK");
      }
      let customer = await tx.customer.findFirst({ where: { companyId: company.id, phone: data.phone } });
      if (!customer) customer = await tx.customer.create({ data: { companyId: company.id, name: data.name, phone: data.phone, email: data.email || null, address: data.address || null } });
      const number = (counter._max.number ?? 0) + 1;
      const created = await tx.order.create({
        data: {
          companyId: company.id, number, customerId: customer.id, paymentMethod: data.paymentMethod,
          fulfillment: data.fulfillment, subtotalCents: totals.subtotalCents, deliveryCents, totalCents: totals.totalCents,
          deliveryAddress: data.fulfillment === "DELIVERY" ? data.address : null, notes: data.notes || null,
          recipientName: data.name, recipientPhone: data.phone,
          items: { create: data.items.map((item) => { const product = productMap.get(item.productId)!; return { productId: product.id, productName: product.name, quantity: item.quantity, unitPriceCents: product.priceCents, totalCents: product.priceCents * item.quantity, unitCostCents: product.costCents }; }) },
          statusHistory: { create: { to: "NEW" } },
          ...(data.fulfillment === "DELIVERY" ? { delivery: { create: { address: data.address, recipientName: data.name, recipientPhone: data.phone, feeCents: deliveryCents } } } : {}),
        },
      });
      for (const [productId, quantity] of quantities) await tx.stockMovement.create({ data: { companyId: company.id, productId, orderId: created.id, type: "SALE", quantity: -quantity, note: `Pedido público #${number}` } });
      await tx.auditLog.create({ data: { companyId: company.id, action: "public_order.created", entity: "Order", entityId: created.id, metadata: { number, totalCents: totals.totalCents } } });
      const ownerEmail = await ownerEmailForCompany(tx, company.id);
      await enqueueNewOrderNotification(tx, {
        companyId: company.id,
        merchantEmail: company.email || ownerEmail,
        companyName: company.name,
        orderNumber: number,
        customerName: data.name,
        itemCount: data.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCents: totals.totalCents,
        orderId: created.id,
      });
      return created;
    }, { isolationLevel: "Serializable" });
    after(() => processEmailOutbox(10).catch((error) => logger.error("email.outbox_processing_failed", error)));
    return Response.json({ order: { number: order.number, publicToken: order.publicToken, totalCents: order.totalCents } }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const message = reason === "INSUFFICIENT_STOCK" ? "O estoque de algum produto acabou. Atualize a página." : reason === "PRODUCT_NOT_FOUND" ? "Um produto selecionado não está mais disponível." : reason === "PLAN_ORDER_LIMIT" ? "A loja atingiu o limite mensal de pedidos." : reason === "SUBSCRIPTION_INACTIVE" ? "A loja está temporariamente indisponível." : "Não foi possível registrar o pedido.";
    return Response.json({ error: message }, { status: 409 });
  }
}
