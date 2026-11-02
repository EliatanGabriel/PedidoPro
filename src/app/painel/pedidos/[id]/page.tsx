import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { money, orderStatusLabel } from "@/lib/format";
import { OrderStatusForm, PaymentForm, RefundPaymentForm } from "@/components/order-actions";
import { OrderEditForm } from "@/components/order-edit-form";
import { DeliveryForm } from "@/components/delivery-form";
import { AccessDenied } from "@/components/access-denied";

const paymentLabels: Record<string, string> = { PIX: "PIX", CASH: "Dinheiro", CREDIT_CARD: "Crédito", DEBIT_CARD: "Débito", BANK_TRANSFER: "Transferência", OTHER: "Outro" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_orders")) return <AccessDenied />;
  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, companyId: context.company.id }, include: { customer: true, items: true, payments: { orderBy: { createdAt: "desc" } }, delivery: true, statusHistory: { orderBy: { createdAt: "desc" } } } });
  if (!order) notFound();
  const [products, customers] = await Promise.all([
    prisma.product.findMany({ where: { companyId: context.company.id, OR: [{ isActive: true }, { id: { in: order.items.flatMap((item) => item.productId ? [item.productId] : []) } }] }, select: { id: true, name: true, priceCents: true, stock: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { companyId: context.company.id }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  const received = order.payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + payment.amountCents, 0);
  const phone = (order.customer?.phone ?? order.recipientPhone)?.replace(/\D/g, "");
  const customerName = order.customer?.name ?? order.recipientName;
  const shareText = `Olá${customerName ? ` ${customerName}` : ""}! Atualização do pedido #${order.number}: ${orderStatusLabel(order.status)}. Total: ${money(order.totalCents)}. Acompanhe: ${process.env.NEXT_PUBLIC_APP_URL}/acompanhar/${order.publicToken}`;
  const editable = ["NEW", "AWAITING_PAYMENT"].includes(order.status) && can(context, "edit_orders");

  return <div className="content">
    <Link href="/painel/pedidos" className="text-xs font-semibold text-[#177a56]">← Voltar aos pedidos</Link>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Detalhes do pedido</p><h1 className="page-title">Pedido #{order.number}</h1><p className="page-subtitle">Criado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(order.createdAt)}</p></div><span className="badge">{orderStatusLabel(order.status)}</span></div>
    {editable && <div className="mt-5"><OrderEditForm order={order} products={products} customers={customers}/></div>}
    <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_340px]"><div className="space-y-4">
      <section className="card p-5"><h2 className="section-title">Itens</h2><div className="mt-4 divide-y divide-[#edf0ed]">{order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{item.quantity} × {item.productName}<small className="ml-2 text-xs text-[#87928b]">{money(item.unitPriceCents)} cada</small></span><strong>{money(item.totalCents)}</strong></div>)}</div><div className="mt-3 space-y-2 border-t border-[#edf0ed] pt-4 text-sm"><div className="flex justify-between"><span className="text-[#748078]">Subtotal</span><span>{money(order.subtotalCents)}</span></div><div className="flex justify-between"><span className="text-[#748078]">Desconto</span><span>− {money(order.discountCents)}</span></div><div className="flex justify-between"><span className="text-[#748078]">Entrega</span><span>{money(order.deliveryCents)}</span></div><div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><span>{money(order.totalCents)}</span></div></div></section>
      <section className="card p-5"><h2 className="section-title">Atualização do pedido</h2><p className="my-3 text-xs text-[#748078]">Estado atual: {orderStatusLabel(order.status)}</p>{can(context, "update_order_status") && <OrderStatusForm id={order.id} status={order.status}/>}</section>
      <section className="card p-5"><h2 className="section-title">Histórico</h2><div className="mt-3 space-y-3">{order.statusHistory.map((item) => <div key={item.id} className="flex justify-between gap-3 border-t border-[#edf0ed] pt-3 text-xs"><span>{item.from ? `${orderStatusLabel(item.from)} → ` : "Pedido criado → "}{orderStatusLabel(item.to)}</span><span className="text-[#87928b]">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.createdAt)}</span></div>)}</div></section>
    </div><aside className="space-y-4">
      <section className="card p-5"><h2 className="section-title">Cliente</h2><p className="mt-4 text-sm font-semibold">{customerName ?? "Venda rápida"}</p><p className="mt-1 text-xs text-[#748078]">{order.customer?.phone ?? order.recipientPhone ?? order.customer?.email ?? "Sem contato cadastrado"}</p>{phone && <a target="_blank" rel="noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(shareText)}`} className="button secondary mt-4 inline-block">Compartilhar no WhatsApp</a>}</section>
      <section className="card p-5"><h2 className="section-title">Pagamento</h2><p className="mt-3 text-xs text-[#748078]">Status: {order.paymentStatus.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#748078]">Forma: {order.paymentMethod ? paymentLabels[order.paymentMethod] : "A definir"}</p><p className="mt-1 text-xs text-[#748078]">Recebido: {money(received)} de {money(order.totalCents)}</p>{order.payments.map((payment) => <div key={payment.id} className="mt-3 border-t border-[#edf0ed] pt-3 text-xs"><div className="flex justify-between"><span>{paymentLabels[payment.method]}</span><strong>{money(payment.amountCents)}</strong></div><p className="mt-1 text-[#87928b]">{payment.refundedAt ? `Estornado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(payment.refundedAt)}` : payment.paidAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(payment.paidAt) : "Pendente"}</p>{payment.refundReason && <p className="mt-1 text-[#748078]">Motivo: {payment.refundReason}</p>}{payment.refundReference && <p className="mt-1 text-[#748078]">Referência: {payment.refundReference}</p>}{can(context, "manage_payments") && payment.status === "PAID" && <RefundPaymentForm orderId={order.id} paymentId={payment.id} amountCents={payment.amountCents}/>}</div>)}{can(context, "manage_payments") && order.paymentStatus !== "PAID" && order.status !== "CANCELED" && <div className="mt-5 border-t border-[#edf0ed] pt-5"><PaymentForm id={order.id} remainingCents={order.totalCents - received}/></div>}</section>
      {order.fulfillment === "DELIVERY" && <section className="card p-5"><h2 className="section-title">Entrega</h2><p className="mt-3 text-xs">{order.deliveryAddress}</p><p className="mt-2 text-xs text-[#748078]">Status: {order.delivery?.status.replaceAll("_", " ") ?? "Aguardando retirada"}</p>{order.delivery && can(context, "manage_deliveries") && <DeliveryForm orderId={order.id} status={order.delivery.status} expectedAt={order.delivery.expectedAt ? new Date(order.delivery.expectedAt.getTime() - order.delivery.expectedAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} notes={order.delivery.notes ?? ""}/>}</section>}
    </aside></div>
  </div>;
}
