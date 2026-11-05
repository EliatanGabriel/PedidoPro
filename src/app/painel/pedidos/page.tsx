import Link from "next/link";
import { Printer, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { money, orderStatusLabel, parseBrazilDateEnd, parseBrazilDateStart } from "@/lib/format";
import { AccessDenied } from "@/components/access-denied";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Novo", color: "#1d4ed8" },
  AWAITING_PAYMENT: { label: "Aguardando pagamento", color: "#b45309" },
  PAYMENT_APPROVED: { label: "Pagamento aprovado", color: "#15803d" },
  PREPARING: { label: "Em preparação", color: "#b45309" },
  READY_FOR_PICKUP: { label: "Pronto para retirada", color: "#1d4ed8" },
  OUT_FOR_DELIVERY: { label: "Saiu para entrega", color: "#1d4ed8" },
  COMPLETED: { label: "Concluído", color: "#15803d" },
  CANCELED: { label: "Cancelado", color: "#b91c1c" },
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }> }) {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_orders")) return <AccessDenied />;
  const filters = await searchParams;
  const allowed = ["NEW", "AWAITING_PAYMENT", "PAYMENT_APPROVED", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELED"];
  const status = allowed.includes(filters.status ?? "") ? filters.status : undefined;
  const query = filters.q?.trim();
  const from = filters.from ? (parseBrazilDateStart(filters.from) ?? new Date(Number.NaN)) : undefined;
  const to = filters.to ? (parseBrazilDateEnd(filters.to) ?? new Date(Number.NaN)) : undefined;
  const datesValid = (!from || !Number.isNaN(from.getTime())) && (!to || !Number.isNaN(to.getTime())) && (!from || !to || from <= to);
  const parsedNumber = query && /^\d+$/.test(query) ? Number(query) : undefined;
  const number = parsedNumber !== undefined && Number.isSafeInteger(parsedNumber) ? parsedNumber : undefined;
  const orders = datesValid
    ? await prisma.order.findMany({
        where: {
          companyId: context.company.id,
          ...(status ? { status: status as never } : {}),
          ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
          ...(query
            ? {
                OR: [
                  { customer: { is: { name: { contains: query, mode: "insensitive" as const } } } },
                  ...(number !== undefined ? [{ number }] : []),
                ],
              }
            : {}),
        },
        include: { customer: { select: { name: true } }, items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];
  const totalValue = orders.reduce((sum, order) => sum + order.totalCents, 0);
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Vendas</p>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">Acompanhe cada venda do recebimento à conclusão.</p>
        </div>
        {can(context, "create_orders") && (
          <Link className="button inline-flex items-center gap-2" href="/painel/pedidos/novo">
            Novo pedido <Search size={15} />
          </Link>
        )}
        <Link className="button secondary inline-flex items-center gap-2" href="/api/reports/sales?from=1970-01-01&to=2100-12-31">
          Exportar <Printer size={15} />
        </Link>
      </div>

      <div className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto]">
        <label className="text-xs font-semibold">Buscar número ou cliente
          <input name="q" defaultValue={query} className="input mt-2" placeholder="Ex.: 125 ou Maria" />
        </label>
        <label className="text-xs font-semibold">De
          <input name="from" type="date" defaultValue={filters.from ?? ""} className="input mt-2" />
        </label>
        <label className="text-xs font-semibold">Até
          <input name="to" type="date" defaultValue={filters.to ?? ""} className="input mt-2" />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button className="button self-end">Filtrar pedidos</button>
      </div>
      {!datesValid && <p className="error mt-3">O período informado é inválido.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {[["Todos", ""], ["Novos", "NEW"], ["Aguardando pagamento", "AWAITING_PAYMENT"], ["Em preparação", "PREPARING"], ["Concluídos", "COMPLETED"], ["Cancelados", "CANCELED"]].map(
          ([label, value]) => (
            <Link
              key={label}
              href={value ? `/painel/pedidos?status=${value}` : "/painel/pedidos"}
              className={`rounded-full border px-3 py-2 text-xs transition ${
                status === value || (!status && !value)
                  ? "border-[#177a56] bg-[#edf6f1] text-[#176b4c]"
                  : "border-[#e0e7e2] bg-white text-[#68756d]"
              }`}
            >
              {label}
            </Link>
          )
        )}
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="p-5 border-b border-[#e5ebe6]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Pedidos</h2>
              <p className="text-xs text-[#748078]">{orders.length} encontrado{orders.length !== 1 ? "s" : ""} · {money(totalValue)} no total</p>
            </div>
          </div>
        </div>
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.status] ?? { label: orderStatusLabel(order.status), color: "#748078" };
                  return (
                    <tr key={order.id} className="group hover:bg-[#f7f9f7]/50">
                      <td className="font-semibold">
                        <Link className="text-[#177a56]" href={`/painel/pedidos/${order.id}`}>
                          #{order.number}
                        </Link>
                      </td>
                      <td>{order.customer?.name ?? "Não identificado"}</td>
                      <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td>
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(order.createdAt)}
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: `${statusInfo.color}15`, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="font-semibold">{money(order.totalCents)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty p-12">
            <p className="text-xs text-[#748078]">Nenhum pedido encontrado para este filtro.</p>
          </div>
        )}
      </section>
    </div>
  );
}
