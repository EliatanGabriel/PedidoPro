import { Download, BarChart3, CreditCard, ShoppingBag, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { can, getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { brazilDateInput, brazilStartOfMonth, money, parseBrazilDateEnd, parseBrazilDateStart } from "@/lib/format";
import { AccessDenied, PlanRequired } from "@/components/access-denied";
import { hasPlanFeature } from "@/lib/plans";
import { calculateEstimatedNetCents } from "@/lib/order-rules";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_reports")) return <AccessDenied />;
  if (!(await hasPlanFeature(context.company.id, "reports"))) return <PlanRequired feature="Relatórios" />;
  const [advanced, expensesEnabled] = await Promise.all([
    hasPlanFeature(context.company.id, "advanced_reports"),
    hasPlanFeature(context.company.id, "expenses"),
  ]);
  const query = await searchParams;
  const from = query.from ? (parseBrazilDateStart(query.from) ?? new Date(Number.NaN)) : brazilStartOfMonth();
  const to = query.to ? (parseBrazilDateEnd(query.to) ?? new Date(Number.NaN)) : new Date();
  const valid = !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to;
  const [orders, topProducts, customers, leastProducts, expenses] = valid
    ? await Promise.all([
        prisma.order.findMany({
          where: { companyId: context.company.id, createdAt: { gte: from, lte: to } },
          include: {
            items: { select: { quantity: true, unitCostCents: true } },
            payments: { where: { status: { in: ["PAID", "REFUNDED"] } }, select: { amountCents: true, status: true } },
          },
        }),
        prisma.orderItem.groupBy({
          by: ["productId", "productName"],
          where: { order: { companyId: context.company.id, createdAt: { gte: from, lte: to }, status: { not: "CANCELED" } } },
          _sum: { quantity: true, totalCents: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),
        advanced
          ? prisma.order.groupBy({
              by: ["customerId"],
              where: {
                companyId: context.company.id,
                customerId: { not: null },
                createdAt: { gte: from, lte: to },
                status: { not: "CANCELED" },
              },
              _count: { _all: true },
              _sum: { totalCents: true },
              orderBy: { _sum: { totalCents: "desc" } },
              take: 5,
            })
          : Promise.resolve([]),
        advanced
          ? prisma.orderItem.groupBy({
              by: ["productId", "productName"],
              where: { order: { companyId: context.company.id, createdAt: { gte: from, lte: to }, status: { not: "CANCELED" } } },
              _sum: { quantity: true },
              orderBy: { _sum: { quantity: "asc" } },
              take: 5,
            })
          : Promise.resolve([]),
        expensesEnabled
          ? prisma.expense.findMany({
              where: { companyId: context.company.id, occurredAt: { gte: from, lte: to }, voidedAt: null },
              select: { amountCents: true },
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], []];
  const activeOrders = orders.filter((order) => order.status !== "CANCELED");
  const gross = activeOrders.reduce((sum, order) => sum + order.subtotalCents + order.deliveryCents, 0);
  const discounts = activeOrders.reduce((sum, order) => sum + order.discountCents, 0);
  const received = activeOrders.reduce(
    (sum, order) => sum + order.payments.reduce((paid, payment) => paid + (payment.status === "PAID" ? payment.amountCents : 0), 0),
    0,
  );
  const canceled = orders.filter((order) => order.status === "CANCELED").length;
  const averageOrder = activeOrders.length ? Math.round(activeOrders.reduce((sum, order) => sum + order.totalCents, 0) / activeOrders.length) : 0;
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  const estimatedNet = expensesEnabled
    ? calculateEstimatedNetCents(
        activeOrders.map((order) => ({
          ...order,
          refundedCents: order.payments.reduce((sum, payment) => sum + (payment.status === "REFUNDED" ? payment.amountCents : 0), 0),
        })),
        expenses.map((expense) => expense.amountCents),
      )
    : null;
  const customerIds = customers.flatMap((customer) => (customer.customerId ? [customer.customerId] : []));
  const customerRecords = customerIds.length ? await prisma.customer.findMany({ where: { companyId: context.company.id, id: { in: customerIds } }, select: { id: true, name: true } }) : [];
  const customerNames = new Map(customerRecords.map((customer) => [customer.id, customer.name]));
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Desempenho</p>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Receita, pagamentos e pedidos do período selecionado.</p>
        </div>
        <Link className="button inline-flex items-center gap-2" href={`/api/reports/sales?from=${valid ? from.toISOString() : ""}&to=${valid ? to.toISOString() : ""}`}>
          <Download size={15} /> Exportar CSV
        </Link>
      </div>

      <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[150px_150px_auto]">
        <label className="text-xs font-semibold">De
          <input name="from" type="date" defaultValue={valid ? brazilDateInput(from) : ""} className="input mt-2" />
        </label>
        <label className="text-xs font-semibold">Até
          <input name="to" type="date" defaultValue={valid ? brazilDateInput(to) : ""} className="input mt-2" />
        </label>
        <button className="button self-end">Aplicar período</button>
      </form>
      {!valid && <p className="error mt-3">Informe um período válido.</p>}

      {valid && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Receita bruta", money(gross), "#15803d"],
              ["Pagamentos recebidos", money(received), "#177a56"],
              ["Ticket médio", money(averageOrder), "#1d4ed8"],
              ["Descontos concedidos", money(discounts), "#b45309"],
              ["Pedidos cancelados", String(canceled), "#b91c1c"],
              ...(expensesEnabled ? [["Despesas registradas", money(expenseTotal), "#748078"]] : []),
            ].map(([label, value, color]) => (
              <article className="card stat-card p-5" key={label}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">{label}</p>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#177a56]/10 text-[#177a56]">
                      {label === "Receita bruta" && <TrendingUp size={16} />}
                      {label === "Pagamentos recebidos" && <CreditCard size={16} />}
                      {label === "Ticket médio" && <ShoppingBag size={16} />}
                      {label === "Descontos concedidos" && <CreditCard size={16} />}
                      {label === "Pedidos cancelados" && <Users size={16} />}
                      {label === "Despesas registradas" && <BarChart3 size={16} />}
                    </div>
                  </div>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              </article>
            ))}
          </div>

          <section className="card mt-5 p-5">
            <h2 className="section-title mb-4">Produtos mais vendidos</h2>
            {topProducts.length ? (
              <div className="mt-4 divide-y divide-[#edf0ed]">
                {topProducts.map((product) => (
                  <div key={`${product.productId}-${product.productName}`} className="flex justify-between py-3 text-sm group hover:bg-[#f7f9f7]/50">
                    <span>{product.productName}</span>
                    <span className="font-semibold">{product._sum.quantity ?? 0} un. · {money(product._sum.totalCents ?? 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty p-4">Sem vendas no período.</p>
            )}
          </section>

          {expensesEnabled && (
            <section className="card mt-4 p-5">
              <h2 className="section-title mb-3">Resultado estimado após custos dos produtos e despesas</h2>
              {estimatedNet === null ? (
                <p className="mt-3 text-xs leading-5 text-[#748078]">
                  Indisponível: cadastre o custo de aquisição dos produtos. Pedidos anteriores à ativação do snapshot de custo também não
                  permitem esta estimativa.
                </p>
              ) : (
                <p className="mt-3 text-2xl font-bold">{money(estimatedNet)}</p>
              )}
              <p className="mt-2 text-[10px] leading-4 text-[#87928b]">
                Considera o custo informado no momento da venda e as despesas registradas. Não inclui impostos, taxas financeiras ou gastos não
                lançados.
              </p>
            </section>
          )}

          {advanced && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <section className="card p-5">
                <h2 className="section-title mb-4">Clientes que mais compraram</h2>
                {customers.length ? (
                  <div className="mt-3 divide-y divide-[#edf0ed]">
                    {customers.map((customer) => (
                      <div key={String(customer.customerId)} className="flex justify-between py-3 text-sm">
                        <div>
                          <p className="font-semibold">{customerNames.get(String(customer.customerId)) ?? "Cliente"}</p>
                          <p className="text-[10px] text-[#748078]">{customer._count._all} pedido{customer._count._all !== 1 ? "s" : ""}</p>
                        </div>
                        <span className="font-bold">{money(customer._sum.totalCents ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty p-4">Sem clientes no período.</p>
                )}
              </section>
              <section className="card p-5">
                <h2 className="section-title mb-4">Produtos menos vendidos</h2>
                {leastProducts.length ? (
                  <div className="mt-3 divide-y divide-[#edf0ed]">
                    {leastProducts.map((product) => (
                      <div key={product.productId} className="flex justify-between py-3 text-sm">
                        <span>{product.productName}</span>
                        <span className="font-semibold">{product._sum.quantity ?? 0} un.</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty p-4">Sem produtos no período.</p>
                )}
              </section>
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-[#748078]">
            Receita bruta inclui itens e entrega antes de descontos. Pagamentos recebidos considera lançamentos pagos e exclui valores estornados.
            Resultado estimado considera os estornos, custos dos produtos e despesas registradas; não equivale a lucro contábil e não inclui
            impostos ou taxas financeiras.
          </p>
        </>
      )}
    </div>
  );
}
