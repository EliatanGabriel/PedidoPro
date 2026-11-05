import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brazilStartOfMonth, dateTime, money, orderStatusLabel } from "@/lib/format";
import { AdminCompanyAction } from "@/components/admin-company-action";

const roleLabels: Record<string, string> = { OWNER: "Proprietário", MANAGER: "Gerente", EMPLOYEE: "Funcionário" };

function limitText(used: number, limit: number) {
  return limit > 0 ? `${used} de ${limit}` : `${used} (sem limite)`;
}

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, monthlyOrders] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, orders: true, products: true, customers: true, expenses: true, privacyRequests: true } },
        subscription: { include: { plan: true, invoices: { orderBy: { createdAt: "desc" }, take: 6 } } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, platformRole: true, emailVerified: true, createdAt: true } } },
          orderBy: { createdAt: "asc" },
        },
        orders: {
          select: { id: true, number: true, status: true, totalCents: true, createdAt: true, customer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
        auditLogs: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
    }),
    prisma.order.count({ where: { companyId: id, createdAt: { gte: brazilStartOfMonth() } } }),
  ]);
  if (!company) notFound();

  const plan = company.subscription?.plan;
  const usage: [string, string][] = [
    ["Pedidos no mês", limitText(monthlyOrders, plan?.monthlyOrderLimit ?? 0)],
    ["Produtos cadastrados", limitText(company._count.products, plan?.productLimit ?? 0)],
    ["Usuários da equipe", limitText(company._count.members, plan?.userLimit ?? 0)],
  ];

  return <div className="content">
    <Link href="/admin/empresas" className="text-xs font-semibold text-[#177a56]">← Voltar às empresas</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">Detalhes da empresa</p>
        <h1 className="page-title">{company.name}</h1>
        <p className="page-subtitle">Criada em {dateTime(company.createdAt)} · loja pública em /loja/{company.slug}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="badge">{company.isActive ? "Ativa" : "Bloqueada"}</span>
        <AdminCompanyAction id={company.id} isActive={company.isActive} />
        <Link className="button secondary" href={`/admin/assinaturas?q=${encodeURIComponent(company.slug)}`}>Gerenciar assinatura</Link>
        {company.isActive && <Link className="button secondary" href={`/loja/${company.slug}`} target="_blank">Ver loja</Link>}
      </div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Pedidos", company._count.orders], ["Produtos", company._count.products], ["Clientes", company._count.customers], ["Despesas", company._count.expenses]].map(([label, value]) => (
        <article key={label} className="card stat-card"><p className="stat-label">{label}</p><p className="stat-value">{value}</p></article>
      ))}
    </div>

    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Assinatura e uso do plano</h2>
            {plan ? <span className="badge">{plan.name} · {money(plan.priceCents)}/mês</span> : <span className="badge">Sem plano</span>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><p className="stat-label">Status</p><p className="mt-1 text-sm font-semibold">{company.subscription?.status ?? "—"}</p></div>
            <div><p className="stat-label">Provedor de cobrança</p><p className="mt-1 text-sm font-semibold">{company.subscription?.provider ?? "Manual"}</p></div>
            <div><p className="stat-label">Fim da avaliação</p><p className="mt-1 text-sm font-semibold">{company.subscription?.trialEndsAt ? dateTime(company.subscription.trialEndsAt) : "—"}</p></div>
            <div><p className="stat-label">Fim do período</p><p className="mt-1 text-sm font-semibold">{company.subscription?.currentPeriodEndsAt ? dateTime(company.subscription.currentPeriodEndsAt) : "—"}</p></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {usage.map(([label, value]) => <div key={label} className="rounded-lg border border-[#edf0ed] p-3"><p className="stat-label">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="section-title">Pedidos recentes</h2><span className="text-xs text-[#87928b]">{company._count.orders} no total</span></div>
          {company.orders.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Pedido</th><th className="hidden md:table-cell">Cliente</th><th className="hidden md:table-cell">Status</th><th className="hidden md:table-cell">Data</th><th>Total</th></tr></thead><tbody>{company.orders.map((order) => <tr key={order.id}><td className="font-semibold">#{order.number}</td><td className="hidden md:table-cell">{order.customer?.name ?? "Venda rápida"}</td><td className="hidden md:table-cell"><span className="badge">{orderStatusLabel(order.status)}</span></td><td className="hidden md:table-cell">{dateTime(order.createdAt)}</td><td>{money(order.totalCents)}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhum pedido registrado.</div>}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="section-title">Equipe</h2><span className="text-xs text-[#87928b]">{company._count.members} integrante{company._count.members === 1 ? "" : "s"}</span></div>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Nome</th><th className="hidden md:table-cell">E-mail</th><th className="hidden md:table-cell">Perfil</th><th className="hidden md:table-cell">Desde</th></tr></thead><tbody>{company.members.map((member) => <tr key={member.id}><td className="font-semibold">{member.user.name}{member.user.platformRole === "PLATFORM_ADMIN" && <span className="badge ml-2">Admin</span>}<span className="block text-[10px] font-normal text-[#87928b] md:hidden">{member.user.email}</span></td><td className="hidden md:table-cell">{member.user.email}</td><td className="hidden md:table-cell">{roleLabels[member.role] ?? member.role}</td><td className="hidden md:table-cell">{dateTime(member.createdAt)}</td></tr>)}</tbody></table></div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="section-title">Faturas da assinatura</h2><span className="text-xs text-[#87928b]">Últimas 6</span></div>
          {company.subscription?.invoices.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Valor</th><th className="hidden md:table-cell">Status</th><th className="hidden md:table-cell">Pago em</th><th>Criada em</th></tr></thead><tbody>{company.subscription.invoices.map((invoice) => <tr key={invoice.id}><td className="font-semibold">{money(invoice.amountCents)}</td><td className="hidden md:table-cell"><span className="badge">{invoice.status}</span></td><td className="hidden md:table-cell">{invoice.paidAt ? dateTime(invoice.paidAt) : "—"}</td><td>{dateTime(invoice.createdAt)}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma fatura registrada.</div>}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="section-title">Contato e operação</h2>
          <div className="mt-4 space-y-2 text-xs text-[#748078]">
            <p><strong className="font-semibold">E-mail:</strong> {company.email ?? "—"}</p>
            <p><strong className="font-semibold">Telefone:</strong> {company.phone ?? "—"}</p>
            <p><strong className="font-semibold">Modalidades:</strong> {[company.acceptsPickup && "Retirada", company.acceptsDelivery && "Entrega"].filter(Boolean).join(", ") || "—"}</p>
            <p><strong className="font-semibold">Taxa de entrega:</strong> {money(company.deliveryFeeCents)}</p>
            <p><strong className="font-semibold">Estoque negativo:</strong> {company.allowNegativeStock ? "Permitido" : "Bloqueado"}</p>
            <p><strong className="font-semibold">Solicitações LGPD:</strong> {company._count.privacyRequests}</p>
          </div>
          <div className="mt-4 grid gap-2">
            <Link className="button secondary" href={`/admin/auditoria?company=${company.id}`}>Ver auditoria da empresa</Link>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="section-title">Atividade recente</h2><Link className="text-xs font-semibold text-[#177a56]" href={`/admin/auditoria?company=${company.id}`}>Ver tudo</Link></div>
          <div className="mt-3 space-y-3">{company.auditLogs.length ? company.auditLogs.map((log) => <div key={log.id} className="border-t border-[#edf0ed] pt-3 text-xs"><p className="font-semibold">{log.action}</p><p className="mt-1 text-[#87928b]">{log.user?.email ?? "Sistema"} · {dateTime(log.createdAt)}</p></div>) : <p className="text-xs text-[#748078]">Nenhum evento registrado.</p>}</div>
        </section>
      </aside>
    </div>
  </div>;
}
