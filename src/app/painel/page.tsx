import { ArrowUpRight, Clock3, PackageCheck, ShoppingBag, WalletCards } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { brazilDateInput, brazilStartOfDay, money, orderStatusLabel, parseBrazilDateStart } from "@/lib/format";
import { AccessDenied } from "@/components/access-denied";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_orders")) return <AccessDenied />;
  const canViewProducts = can(context, "view_products");
  const companyId = context.company.id;
  const start = brazilStartOfDay();
  const from = new Date(start); from.setDate(from.getDate() - 6);
  const filters = await searchParams;
  const range = ["today", "7d", "30d", "90d", "custom"].includes(filters.range ?? "") ? filters.range! : "30d";
  let rangeStart = new Date(start);
  if (range === "7d") rangeStart.setDate(rangeStart.getDate() - 6);
  if (range === "30d") rangeStart.setDate(rangeStart.getDate() - 29);
  if (range === "90d") rangeStart.setDate(rangeStart.getDate() - 89);
  if (range === "custom") rangeStart = filters.from ? parseBrazilDateStart(filters.from) ?? new Date(Number.NaN) : new Date(Number.NaN);
  const rangeEnd = range === "custom" ? filters.to ? parseBrazilDateStart(filters.to) : undefined : new Date(start);
  if (rangeEnd) rangeEnd.setDate(rangeEnd.getDate() + 1);
  const rangeValid = !Number.isNaN(rangeStart.getTime()) && !!rangeEnd && !Number.isNaN(rangeEnd.getTime()) && rangeStart < rangeEnd;
  const periodWhere = rangeValid ? { createdAt: { gte: rangeStart, lt: rangeEnd } } : { id: "__invalid_period__" };
  const [total, today, pending, preparing, completed, canceled, revenue, recent, products, salesWindow] = await Promise.all([
    prisma.order.count({ where: { companyId, ...periodWhere } }),
    prisma.order.count({ where: { companyId, createdAt: { gte: start } } }),
    prisma.order.count({ where: { companyId, status: { in: ["NEW", "AWAITING_PAYMENT"] } } }),
    prisma.order.count({ where: { companyId, status: { in: ["PAYMENT_APPROVED", "PREPARING"] } } }),
    prisma.order.count({ where: { companyId, status: "COMPLETED", ...periodWhere } }),
    prisma.order.count({ where: { companyId, status: "CANCELED", ...periodWhere } }),
    prisma.order.aggregate({ where: { companyId, status: { not: "CANCELED" }, ...periodWhere }, _sum: { subtotalCents: true, deliveryCents: true }, _avg: { totalCents: true } }),
    prisma.order.findMany({ where: { companyId, ...periodWhere }, include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    canViewProducts ? prisma.product.count({ where: { companyId, isActive: true } }) : Promise.resolve(0),
    prisma.order.findMany({ where: { companyId, status: { not: "CANCELED" }, createdAt: { gte: from } }, select: { createdAt: true, totalCents: true } }),
  ]);
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(from); date.setDate(from.getDate() + index);
    const key = brazilDateInput(date);
    const cents = salesWindow.filter((order) => brazilDateInput(order.createdAt) === key).reduce((sum, order) => sum + order.totalCents, 0);
    return { label: new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" }).format(date).replace(".", ""), cents };
  });
  const maxDaily = Math.max(...daily.map((day) => day.cents), 1);
  const cards = [
    { label: "Pedidos no período", value: total.toLocaleString("pt-BR"), foot: `${today} recebidos hoje`, icon: ShoppingBag },
    { label: "Aguardando ação", value: pending.toLocaleString("pt-BR"), foot: `${preparing} em andamento`, icon: Clock3 },
    { label: "Faturamento bruto", value: money((revenue._sum.subtotalCents ?? 0) + (revenue._sum.deliveryCents ?? 0)), foot: "Antes dos descontos · pedidos ativos", icon: WalletCards },
    { label: "Ticket médio", value: money(Math.round(revenue._avg.totalCents ?? 0)), foot: `${completed} pedidos concluídos`, icon: PackageCheck },
  ];
  return <div className="content"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Painel da empresa</p><h1 className="page-title">Bom dia, {context.user.name.split(" ")[0]}</h1><p className="page-subtitle">Acompanhe o ritmo da sua operação.</p></div>{can(context, "create_orders") && <Link className="button inline-flex items-center gap-2" href="/painel/pedidos/novo">Novo pedido <ArrowUpRight size={15} /></Link>}</div>
    <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[180px_180px_180px_auto]"><label className="text-xs font-semibold">Período<select name="range" defaultValue={range} className="input mt-2"><option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option><option value="custom">Personalizado</option></select></label><label className="text-xs font-semibold">De<input name="from" type="date" defaultValue={filters.from??""} className="input mt-2"/></label><label className="text-xs font-semibold">Até<input name="to" type="date" defaultValue={filters.to??""} className="input mt-2"/></label><button className="button self-end">Aplicar filtro</button></form>{!rangeValid&&<p role="alert" className="error mt-3">Selecione um período válido.</p>}
    <section aria-label="Indicadores de vendas" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, foot, icon: Icon }) => <article className="card stat-card" key={label}><div className="flex items-center justify-between"><span className="stat-label">{label}</span><Icon size={17} color="#6a8c78" /></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></article>)}</section>
    <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="section-title">Vendas nos últimos 7 dias</h2><p className="mt-1 text-xs text-[#87928b]">Faturamento bruto por dia</p></div><span className="badge">Dados reais</span></div><div className="mt-5 flex h-36 items-end gap-3 border-b border-[#e8ede9] px-2">{daily.map((day)=><div key={day.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[9px] text-[#718078]">{day.cents?money(day.cents):""}</span><div title={money(day.cents)} style={{height:`${day.cents?Math.max(5,day.cents/maxDaily*72):2}%`}} className={`w-full max-w-10 rounded-t bg-[#61a77e] ${day.cents?"":"opacity-20"}`} /><span className="mb-1 text-[10px] text-[#87928b]">{day.label}</span></div>)}</div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Recebidos hoje",today],["Aguardando ação",pending],["Concluídos",completed],["Cancelados",canceled]].map(([label,value])=><div className="rounded-lg bg-[#f7f9f7] p-3" key={label}><p className="text-[11px] text-[#7d8981]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}</div></section><section className="card p-5"><div className="flex items-center justify-between"><div><h2 className="section-title">Catálogo ativo</h2><p className="mt-1 text-xs text-[#87928b]">Produtos disponíveis para venda</p></div><Link className="text-xs font-semibold text-[#177a56]" href="/painel/produtos">Ver catálogo</Link></div><p className="mt-7 text-3xl font-semibold">{products}</p><p className="mt-1 text-xs text-[#87928b]">produtos cadastrados</p><div className="mt-5 rounded-lg bg-[#f1f7f3] p-3 text-xs text-[#547261]">Mantenha estoque e preços atualizados para agilizar os pedidos.</div></section></div>
    <section className="card mt-5 overflow-hidden"><div className="flex items-center justify-between p-5"><div><h2 className="section-title">Pedidos recentes</h2><p className="mt-1 text-xs text-[#87928b]">Últimas movimentações da sua empresa</p></div><Link className="text-xs font-semibold text-[#177a56]" href="/painel/pedidos">Ver todos</Link></div>{recent.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Status</th><th>Total</th></tr></thead><tbody>{recent.map((order)=><tr key={order.id}><td className="font-semibold">#{order.number}</td><td>{order.customer?.name ?? "Cliente não informado"}</td><td>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(order.createdAt)}</td><td><span className="badge">{orderStatusLabel(order.status)}</span></td><td className="font-semibold">{money(order.totalCents)}</td></tr>)}</tbody></table></div>:<div className="empty">Seus pedidos aparecerão aqui quando forem cadastrados.</div>}</section>
  </div>;
}
