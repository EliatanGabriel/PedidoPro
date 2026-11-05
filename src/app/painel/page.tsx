import { ArrowUpRight, Clock3, PackageCheck, ShoppingBag, TrendingUp, WalletCards } from "lucide-react";
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
  const grossValue = (revenue._sum.subtotalCents ?? 0) + (revenue._sum.deliveryCents ?? 0);
  const cards = [
    { label: "Pedidos no período", value: total.toLocaleString("pt-BR"), foot: `${today} recebidos hoje`, icon: ShoppingBag, color: "#177a56" },
    { label: "Aguardando ação", value: pending.toLocaleString("pt-BR"), foot: `${preparing} em andamento`, icon: Clock3, color: "#b45309" },
    { label: "Faturamento bruto", value: money(grossValue), foot: "Antes dos descontos · pedidos ativos", icon: WalletCards, color: "#15803d" },
    { label: "Ticket médio", value: money(Math.round(revenue._avg.totalCents ?? 0)), foot: `${completed} pedidos concluídos`, icon: PackageCheck, color: "#1d4ed8" },
  ];
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Painel da empresa</p>
          <h1 className="page-title">Bom dia, {context.user.name.split(" ")[0]}</h1>
          <p className="page-subtitle">Acompanhe o ritmo da sua operação.</p>
        </div>
        {can(context, "create_orders") && (
          <Link className="button inline-flex items-center gap-2" href="/painel/pedidos/novo">
            Novo pedido <ArrowUpRight size={15} />
          </Link>
        )}
      </div>

      <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[180px_180px_180px_auto]">
        <label className="text-xs font-semibold">Período
          <select name="range" defaultValue={range} className="input mt-2">
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label className="text-xs font-semibold">De
          <input name="from" type="date" defaultValue={filters.from ?? ""} className="input mt-2" />
        </label>
        <label className="text-xs font-semibold">Até
          <input name="to" type="date" defaultValue={filters.to ?? ""} className="input mt-2" />
        </label>
        <button className="button self-end">Aplicar filtro</button>
      </form>
      {!rangeValid && <p role="alert" className="error mt-3">Selecione um período válido.</p>}

      <section aria-label="Indicadores de vendas" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, foot, icon: Icon, color }) => (
          <article className="card stat-card p-5" key={label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#177a56]/10 text-[#177a56]">
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{value}</p>
                <p className="text-[10px] text-[#748078]">{foot}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Vendas nos últimos 7 dias</h2>
              <p className="mt-1 text-xs text-[#748078]">Faturamento bruto por dia</p>
            </div>
            <span className="badge">Dados reais</span>
          </div>
          <div className="mt-4 flex h-32 items-end gap-2 border-b border-[#e8ede9] px-1">
            {daily.map((day) => (
              <div key={day.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[9px] text-[#718078]">{day.cents ? money(day.cents) : "R$ 0,00"}</span>
                <div
                  title={money(day.cents)}
                  style={{ height: `${day.cents ? Math.max(4, day.cents / maxDaily * 64) : 2}%` as unknown as React.CSSProperties["height"], width: "48px" }}
                  className="w-full max-w-[48px] rounded-t bg-[#177a56] opacity-80"
                />
                <span className="mb-1 text-[10px] text-[#87928b]">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-title">Resumo rápido</h2>
              <p className="mt-1 text-xs text-[#748078]">Indicadores do período</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              ["Recebidos hoje", today, "#177a56"],
              ["Aguardando ação", pending, "#b45309"],
              ["Concluídos", completed, "#15803d"],
              ["Cancelados", canceled, "#b91c1c"],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-[#f7f9f7]">
                <span className="text-xs text-[#748078]">{label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold" style={{ color: color as string }}>{value}</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color as string }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-lg bg-[#f1f7f3] text-xs text-[#547261]">
            {canViewProducts ? (
              <>
                <p className="font-semibold">{products} produtos cadastrados</p>
                <p className="mt-1">Mantenha estoque e preços atualizados para agilizar os pedidos.</p>
              </>
            ) : (
              <p className="text-xs text-[#748078]">Cadastre produtos para começar a vender.</p>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-7 overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div>
            <h2 className="section-title">Pedidos recentes</h2>
            <p className="mt-1 text-xs text-[#748078]">Últimas movimentações da sua empresa</p>
          </div>
          <Link className="text-xs font-semibold text-[#177a56]" href="/painel/pedidos">
            Ver todos
          </Link>
        </div>
        {recent.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id} className="group hover:bg-[#f7f9f7]/50">
                    <td className="font-semibold">#{order.number}</td>
                    <td>{order.customer?.name ?? "Cliente não informado"}</td>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(order.createdAt)}
                    </td>
                    <td>
                      <span className="badge">{orderStatusLabel(order.status)}</span>
                    </td>
                    <td className="font-semibold">{money(order.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty p-12">
            <p className="text-xs text-[#748078]">Seus pedidos aparecerão aqui quando forem cadastrados.</p>
            {can(context, "create_orders") && (
              <Link className="button mt-4" href="/painel/pedidos/novo">
                Criar primeiro pedido
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
