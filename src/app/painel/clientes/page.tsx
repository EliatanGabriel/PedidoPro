import { Search, User, Phone, Mail, CreditCard } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { money } from "@/lib/format";
import { CustomerForm } from "@/components/customer-form";
import { AccessDenied } from "@/components/access-denied";
import { CustomerRowActions } from "@/components/customer-row-actions";

export default async function CustomersPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "manage_customers")) return <AccessDenied />;
  const [customers, orderStats] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: context.company.id },
      include: {
        orders: {
          where: { status: { not: "CANCELED" } },
          select: { number: true, totalCents: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
      take: 500,
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { companyId: context.company.id, customerId: { not: null }, status: { not: "CANCELED" } },
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
  ]);
  const stats = new Map(orderStats.map((item) => [item.customerId, { count: item._count._all, total: item._sum.totalCents ?? 0 }]));
  const totalCustomers = customers.length;
  const totalSpent = orderStats.reduce((sum, s) => sum + (s._sum.totalCents ?? 0), 0);
  const recurringCustomers = orderStats.filter((s) => s._count._all > 1).length;
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Centralize contatos e acompanhe o histórico de compras.</p>
        </div>
        <Link className="button inline-flex items-center gap-2" href="/painel/clientes/novo">
          Novo cliente <User size={15} />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-5">
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Total de clientes</p>
          <p className="text-2xl font-bold">{totalCustomers}</p>
          <p className="mt-2 text-[10px] text-[#748078]">Cadastros ativos</p>
        </article>
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Total faturado</p>
          <p className="text-2xl font-bold">{money(totalSpent)}</p>
          <p className="mt-2 text-[10px] text-[#748078]">Em pedidos não cancelados</p>
        </article>
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Clientes recorrentes</p>
          <p className="text-2xl font-bold">{recurringCustomers}</p>
          <p className="mt-2 text-[10px] text-[#748078]">Com mais de um pedido</p>
        </article>
      </div>

      <section className="card mt-5">
        <div className="p-5">
          <h2 className="section-title mb-4">Adicionar cliente</h2>
          <CustomerForm />
        </div>
      </section>

      <section className="card mt-4 overflow-hidden">
        <div className="p-5 border-b border-[#e5ebe6]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Sua base</h2>
              <p className="mt-1 text-xs text-[#748078]">{totalCustomers} cliente{totalCustomers !== 1 ? "s" : ""} cadastrado{totalCustomers !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Pedidos</th>
                  <th>Total comprado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const stat = stats.get(customer.id) ?? { count: 0, total: 0 };
                  return (
                    <tr key={customer.id} className="group hover:bg-[#f7f9f7]/50">
                      <td className="font-semibold">
                        {customer.name}
                        {stat.count > 1 && <span className="ml-2 badge" style={{ backgroundColor: "#edf6f1", color: "#176b4c" }}>Recorrente</span>}
                        <details className="mt-1 text-[11px] font-normal text-[#748078]">
                          <summary className="cursor-pointer">Últimos pedidos ({customer.orders.length})</summary>
                          {customer.orders.length ? (
                            customer.orders.map((order) => (
                              <p key={order.number} className="mt-1">
                                #{order.number} ·{" "}
                                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(order.createdAt)}
                                · {money(order.totalCents)}
                              </p>
                            ))
                          ) : (
                            <p className="mt-1 text-[#87928b]">Sem pedidos</p>
                          )}
                        </details>
                      </td>
                      <td>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-[#748078]">
                            <Phone size={12} /> {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-[#748078] mt-1">
                            <Mail size={12} /> {customer.email}
                          </div>
                        )}
                      </td>
                      <td>{stat.count}</td>
                      <td className="font-semibold">{money(stat.total)}</td>
                      <td>
                        <CustomerRowActions customer={customer} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty p-12">
            <p className="text-xs text-[#748078]">Nenhum cliente cadastrado.</p>
            <Link className="button mt-4" href="/painel/clientes/novo">
              Cadastrar primeiro cliente
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
