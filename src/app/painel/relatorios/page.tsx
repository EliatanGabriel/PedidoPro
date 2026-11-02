import Link from "next/link";
import { Download } from "lucide-react";
import { can, getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { brazilDateInput, brazilStartOfMonth, money, parseBrazilDateEnd, parseBrazilDateStart } from "@/lib/format";
import { AccessDenied, PlanRequired } from "@/components/access-denied";
import { hasPlanFeature } from "@/lib/plans";
import { calculateEstimatedNetCents } from "@/lib/order-rules";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_reports")) return <AccessDenied/>;
  if (!await hasPlanFeature(context.company.id, "reports")) return <PlanRequired feature="Relatórios"/>;
  const [advanced, expensesEnabled] = await Promise.all([hasPlanFeature(context.company.id, "advanced_reports"), hasPlanFeature(context.company.id, "expenses")]);
  const query = await searchParams;
  const from = query.from ? (parseBrazilDateStart(query.from) ?? new Date(Number.NaN)) : brazilStartOfMonth();
  const to = query.to ? (parseBrazilDateEnd(query.to) ?? new Date(Number.NaN)) : new Date();
  const valid = !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to;
  const [orders, topProducts, customers, leastProducts, expenses] = valid ? await Promise.all([
    prisma.order.findMany({ where: { companyId: context.company.id, createdAt: { gte: from, lte: to } }, include: { items: { select: { quantity: true, unitCostCents: true } }, payments: { where: { status: { in: ["PAID", "REFUNDED"] } }, select: { amountCents: true, status: true } } } }),
    prisma.orderItem.groupBy({ by: ["productId", "productName"], where: { order: { companyId: context.company.id, createdAt: { gte: from, lte: to }, status: { not: "CANCELED" } } }, _sum: { quantity: true, totalCents: true }, orderBy: { _sum: { quantity: "desc" } }, take: 5 }),
    advanced ? prisma.order.groupBy({ by: ["customerId"], where: { companyId: context.company.id, customerId: { not: null }, createdAt: { gte: from, lte: to }, status: { not: "CANCELED" } }, _count: { _all: true }, _sum: { totalCents: true }, orderBy: { _sum: { totalCents: "desc" } }, take: 5 }) : Promise.resolve([]),
    advanced ? prisma.orderItem.groupBy({ by: ["productId", "productName"], where: { order: { companyId: context.company.id, createdAt: { gte: from, lte: to }, status: { not: "CANCELED" } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "asc" } }, take: 5 }) : Promise.resolve([]),
    expensesEnabled ? prisma.expense.findMany({ where: { companyId: context.company.id, occurredAt: { gte: from, lte: to }, voidedAt: null }, select: { amountCents: true } }) : Promise.resolve([]),
  ]) : [[], [], [], [], []];
  const activeOrders = orders.filter((order) => order.status !== "CANCELED");
  const gross = activeOrders.reduce((sum, order) => sum + order.subtotalCents + order.deliveryCents, 0);
  const discounts = activeOrders.reduce((sum, order) => sum + order.discountCents, 0);
  const received = activeOrders.reduce((sum, order) => sum + order.payments.reduce((paid, payment) => paid + (payment.status === "PAID" ? payment.amountCents : 0), 0), 0);
  const canceled = orders.filter((order) => order.status === "CANCELED").length;
  const averageOrder = activeOrders.length ? Math.round(activeOrders.reduce((sum, order) => sum + order.totalCents, 0) / activeOrders.length) : 0;
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const estimatedNet = expensesEnabled ? calculateEstimatedNetCents(activeOrders.map((order) => ({ ...order, refundedCents: order.payments.reduce((sum, payment) => sum + (payment.status === "REFUNDED" ? payment.amountCents : 0), 0) })), expenses.map((expense) => expense.amountCents)) : null;
  const leastSelling = leastProducts.map((product) => ({ id: product.productId, name: product.productName, quantity: product._sum.quantity ?? 0 }));
  const customerIds = customers.flatMap((customer) => customer.customerId ? [customer.customerId] : []);
  const customerRecords = customerIds.length ? await prisma.customer.findMany({ where: { companyId: context.company.id, id: { in: customerIds } }, select: { id: true, name: true } }) : [];
  const customerNames = new Map(customerRecords.map((customer) => [customer.id, customer.name]));

  return <div className="content"><p className="eyebrow">Desempenho</p><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Receita, pagamentos e pedidos do período selecionado.</p><form className="card mt-6 flex flex-wrap items-end gap-3 p-4"><label className="text-xs font-semibold">De<input name="from" type="date" defaultValue={valid ? brazilDateInput(from) : ""} className="input mt-2"/></label><label className="text-xs font-semibold">Até<input name="to" type="date" defaultValue={valid ? brazilDateInput(to) : ""} className="input mt-2"/></label><button className="button secondary">Aplicar período</button><Link className="button ml-auto inline-flex items-center gap-2" href={`/api/reports/sales?from=${valid ? from.toISOString() : ""}&to=${valid ? to.toISOString() : ""}`}><Download size={15}/>Exportar CSV</Link></form>
    {!valid ? <p className="error mt-4">Informe um período válido.</p> : <><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[["Receita bruta", money(gross)], ["Pagamentos recebidos", money(received)], ["Ticket médio", money(averageOrder)], ["Descontos concedidos", money(discounts)], ["Pedidos cancelados", String(canceled)], ...(expensesEnabled ? [["Despesas registradas", money(expenseTotal)]] : [])].map(([label, value]) => <article className="card stat-card" key={label}><p className="stat-label">{label}</p><p className="stat-value">{value}</p></article>)}</div><section className="card mt-4 p-5"><h2 className="section-title">Produtos mais vendidos</h2>{topProducts.length ? <div className="mt-4 divide-y divide-[#edf0ed]">{topProducts.map((product) => <div key={`${product.productId}-${product.productName}`} className="flex justify-between py-3 text-sm"><span>{product.productName}</span><span className="font-semibold">{product._sum.quantity ?? 0} un. · {money(product._sum.totalCents ?? 0)}</span></div>)}</div> : <p className="empty">Sem vendas no período.</p>}</section>{expensesEnabled&&<section className="card mt-4 p-5"><h2 className="section-title">Resultado estimado após custos dos produtos e despesas</h2>{estimatedNet===null?<p className="mt-3 text-xs leading-5 text-[#748078]">Indisponível: cadastre o custo de aquisição dos produtos. Pedidos anteriores à ativação do snapshot de custo também não permitem esta estimativa.</p>:<p className="mt-3 text-2xl font-bold">{money(estimatedNet)}</p>}<p className="mt-2 text-[10px] leading-4 text-[#87928b]">Considera o custo informado no momento da venda e as despesas registradas. Não inclui impostos, taxas financeiras ou gastos não lançados.</p></section>}{advanced && <div className="mt-4 grid gap-4 lg:grid-cols-2"><section className="card p-5"><h2 className="section-title">Clientes que mais compraram</h2>{customers.length ? <div className="mt-3 divide-y divide-[#edf0ed]">{customers.map((customer) => <div key={customer.customerId} className="flex justify-between gap-4 py-3 text-sm"><span>{customer.customerId ? customerNames.get(customer.customerId) ?? "Cliente removido" : "Sem cliente"}</span><span className="font-semibold">{customer._count._all} pedido(s) · {money(customer._sum.totalCents ?? 0)}</span></div>)}</div> : <p className="empty">Sem compras de clientes cadastrados no período.</p>}</section><section className="card p-5"><h2 className="section-title">Menor volume vendido</h2><div className="mt-3 divide-y divide-[#edf0ed]">{leastSelling.map((product) => <div key={product.id} className="flex justify-between py-3 text-sm"><span>{product.name}</span><span className="font-semibold">{product.quantity} un.</span></div>)}</div>{!leastSelling.length&&<p className="empty">Sem produtos ativos.</p>}</section></div>}{!advanced&&<p className="mt-4 text-xs text-[#748078]">Relatórios avançados, incluindo clientes recorrentes e produtos com menos vendas, estão disponíveis no plano que inclui esse recurso.</p>}</>}
    <p className="mt-5 text-xs leading-5 text-[#748078]">Receita bruta inclui itens e entrega antes de descontos. Pagamentos recebidos considera lançamentos pagos e exclui valores estornados. Resultado estimado considera os estornos, custos dos produtos e despesas registradas; não equivale a lucro contábil e não inclui impostos ou taxas financeiras.</p>
  </div>;
}
