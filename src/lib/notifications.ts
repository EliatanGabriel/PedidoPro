import type { Prisma } from "@prisma/client";
import { enqueueEmail } from "@/lib/email-outbox";
import { escapeHtml } from "@/lib/email";
import { money, orderStatusLabel } from "@/lib/format";

type Db = Prisma.TransactionClient;

function appBaseUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

export function appUrl(path: string) {
  return new URL(path, appBaseUrl()).toString();
}

export async function ownerEmailForCompany(db: Db, companyId: string) {
  const owner = await db.companyMember.findFirst({
    where: { companyId, role: "OWNER" },
    select: { user: { select: { email: true } } },
  });
  return owner?.user.email ?? null;
}

export function newOrderEmailContent({ companyName, orderNumber, customerName, itemCount, totalCents, orderUrl }: {
  companyName: string;
  orderNumber: number;
  customerName: string | null;
  itemCount: number;
  totalCents: number;
  orderUrl: string;
}) {
  const subject = `Novo pedido #${orderNumber} em ${companyName}`;
  const customer = customerName || "Cliente não identificado";
  const text = `Você recebeu um novo pedido em ${companyName}.\n\nPedido: #${orderNumber}\nCliente: ${customer}\nItens: ${itemCount}\nTotal: ${money(totalCents)}\n\nAbra o pedido no painel: ${orderUrl}`;
  const html = `<p>Você recebeu um novo pedido em <strong>${escapeHtml(companyName)}</strong>.</p><ul><li><strong>Pedido:</strong> #${escapeHtml(String(orderNumber))}</li><li><strong>Cliente:</strong> ${escapeHtml(customer)}</li><li><strong>Itens:</strong> ${escapeHtml(String(itemCount))}</li><li><strong>Total:</strong> ${escapeHtml(money(totalCents))}</li></ul><p><a href="${escapeHtml(orderUrl)}">Abrir o pedido no painel</a></p>`;
  return { subject, text, html };
}

export function orderStatusEmailContent({ companyName, orderNumber, status, trackingUrl }: {
  companyName: string;
  orderNumber: number;
  status: string;
  trackingUrl: string;
}) {
  const label = orderStatusLabel(status);
  const subject = `Pedido #${orderNumber}: ${label}`;
  const text = `Seu pedido #${orderNumber} na loja ${companyName} foi atualizado para: ${label}.\n\nAcompanhe o andamento: ${trackingUrl}`;
  const html = `<p>Seu pedido <strong>#${escapeHtml(String(orderNumber))}</strong> na loja ${escapeHtml(companyName)} foi atualizado para:</p><p><strong>${escapeHtml(label)}</strong></p><p><a href="${escapeHtml(trackingUrl)}">Acompanhar pedido</a></p>`;
  return { subject, text, html };
}

export async function enqueueNewOrderNotification(db: Db, data: {
  companyId: string;
  merchantEmail: string | null;
  companyName: string;
  orderNumber: number;
  customerName: string | null;
  itemCount: number;
  totalCents: number;
  orderId: string;
}) {
  if (!data.merchantEmail) return;
  const content = newOrderEmailContent({
    companyName: data.companyName,
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    itemCount: data.itemCount,
    totalCents: data.totalCents,
    orderUrl: appUrl(`/painel/pedidos/${data.orderId}`),
  });
  await enqueueEmail(db, { to: data.merchantEmail, companyId: data.companyId, ...content });
}

export async function enqueueOrderStatusNotification(db: Db, data: {
  companyId: string;
  customerEmail: string | null;
  companyName: string;
  orderNumber: number;
  status: string;
  publicToken: string;
}) {
  if (!data.customerEmail) return;
  const content = orderStatusEmailContent({
    companyName: data.companyName,
    orderNumber: data.orderNumber,
    status: data.status,
    trackingUrl: appUrl(`/acompanhar/${data.publicToken}`),
  });
  await enqueueEmail(db, { to: data.customerEmail, companyId: data.companyId, ...content });
}
