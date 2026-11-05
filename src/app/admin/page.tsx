import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateTime, money } from "@/lib/format";

export default async function AdminDashboard() {
  const [companies, activeCompanies, blockedCompanies, users, admins, orders, subscriptions, revenue, paidSubscriptions, failedEmails, pendingEmails, openPrivacyRequests, recentCompanies, recentAudit] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { isActive: true } }),
    prisma.company.count({ where: { isActive: false } }),
    prisma.user.count(),
    prisma.user.count({ where: { platformRole: "PLATFORM_ADMIN" } }),
    prisma.order.count(),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELED" } }, _sum: { subtotalCents: true, deliveryCents: true } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE", plan: { priceCents: { gt: 0 } } }, select: { plan: { select: { priceCents: true } } } }),
    prisma.emailOutbox.count({ where: { status: "FAILED" } }),
    prisma.emailOutbox.count({ where: { status: "PENDING" } }),
    prisma.privacyRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.company.findMany({ select: { id: true, name: true, slug: true, isActive: true, createdAt: true, subscription: { select: { plan: { select: { name: true } }, status: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.auditLog.findMany({ include: { user: { select: { email: true } }, company: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const mrr = paidSubscriptions.reduce((sum, item) => sum + item.plan.priceCents, 0);
  const activeSubscriptions = subscriptions.find((item) => item.status === "ACTIVE")?._count._all ?? 0;
  const cards: [string, string | number][] = [
    ["Empresas", companies],
    ["Empresas ativas", activeCompanies],
    ["Empresas bloqueadas", blockedCompanies],
    ["Usuários", users],
    ["Pedidos", orders],
    ["Assinaturas ativas", activeSubscriptions],
    ["Receita recorrente (MRR)", money(mrr)],
    ["GMV dos pedidos", money((revenue._sum.subtotalCents ?? 0) + (revenue._sum.deliveryCents ?? 0))],
  ];
  const pending: [string, number, string][] = [
    ["E-mails com falha", failedEmails, "Itens que esgotaram as tentativas"],
    ["E-mails pendentes", pendingEmails, "Aguardando o próximo envio"],
    ["Solicitações LGPD", openPrivacyRequests, "Abertas ou em andamento"],
  ];

  return <div className="content">
    <p className="eyebrow">Indicadores da plataforma</p>
    <h1 className="page-title">Administração</h1>
    <p className="page-subtitle">Métricas agregadas das empresas cadastradas.</p>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => <article key={label} className="card stat-card"><p className="stat-label">{label}</p><p className="stat-value">{value}</p></article>)}
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {pending.map(([label, value, hint]) => <Link key={label} href="/admin/operacoes" className="card p-4 transition hover:border-[#177a56]"><p className="stat-label">{label}</p><p className="mt-2 text-xl font-bold">{value}</p><p className="mt-1 text-[11px] text-[#87928b]">{hint}</p></Link>)}
      <article className="card p-4"><p className="stat-label">Administradores</p><p className="mt-2 text-xl font-bold">{admins}</p><p className="mt-1 text-[11px] text-[#87928b]">Acessos com platformRole</p></article>
    </div>

    <section className="card mt-5 p-5">
      <h2 className="section-title">Assinaturas por status</h2>
      <div className="mt-4 flex flex-wrap gap-3">{subscriptions.length ? subscriptions.map((item) => <span className="badge" key={item.status}>{item.status}: {item._count._all}</span>) : <p className="text-sm text-[#748078]">Nenhuma assinatura registrada.</p>}</div>
    </section>

    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_340px]">
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-5"><h2 className="section-title">Empresas recentes</h2><Link className="text-xs font-semibold text-[#177a56]" href="/admin/empresas">Ver todas</Link></div>
        {recentCompanies.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Empresa</th><th className="hidden md:table-cell">Plano</th><th className="hidden md:table-cell">Status</th><th className="hidden md:table-cell">Cadastro</th></tr></thead><tbody>{recentCompanies.map((company) => <tr key={company.id}><td><Link className="font-semibold text-[#177a56]" href={`/admin/empresas/${company.id}`}>{company.name}</Link><span className="block text-[10px] text-[#87928b]">/loja/{company.slug}</span><span className="mt-1 flex flex-wrap items-center gap-1 md:hidden"><span className="badge">{company.subscription?.plan.name ?? "Sem plano"}</span><span className="badge">{company.isActive ? "Ativa" : "Bloqueada"}</span></span></td><td className="hidden md:table-cell">{company.subscription?.plan.name ?? "—"}</td><td className="hidden md:table-cell"><span className="badge">{company.isActive ? "Ativa" : "Bloqueada"}</span></td><td className="hidden md:table-cell">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(company.createdAt)}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma empresa cadastrada.</div>}
      </section>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="section-title">Ações rápidas</h2>
          <div className="mt-4 grid gap-2">{([["/admin/empresas", "Gerenciar empresas"], ["/admin/usuarios", "Gerenciar usuários"], ["/admin/assinaturas", "Gerenciar assinaturas"], ["/admin/planos", "Editar planos"], ["/admin/operacoes", "Operações e fila de e-mails"], ["/admin/auditoria", "Consultar auditoria"]] as [string, string][]).map(([href, label]) => <Link key={href} className="button secondary" href={href}>{label}</Link>)}</div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="section-title">Atividade recente</h2><Link className="text-xs font-semibold text-[#177a56]" href="/admin/auditoria">Ver tudo</Link></div>
          <div className="mt-3 space-y-3">{recentAudit.length ? recentAudit.map((log) => <div key={log.id} className="border-t border-[#edf0ed] pt-3 text-xs"><p className="font-semibold">{log.action}</p><p className="mt-1 text-[#87928b]">{log.user?.email ?? "Sistema"} · {log.company?.name ?? "Plataforma"}</p><p className="mt-1 text-[10px] text-[#87928b]">{dateTime(log.createdAt)}</p></div>) : <p className="text-xs text-[#748078]">Nenhum evento registrado.</p>}</div>
        </section>
      </aside>
    </div>

    <p className="mt-4 text-xs text-[#87928b]">O GMV considera o total de pedidos não cancelados. A receita recorrente soma apenas assinaturas ativas com plano pago.</p>
  </div>;
}
