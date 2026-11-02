import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { AdminSubscriptionManager } from "@/components/admin-subscription-manager";

const statuses = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const filters = await searchParams;
  const query = filters.q?.trim();
  const status = statuses.find((item) => item === filters.status);
  const [subscriptions, plans] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        ...(query ? { company: { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { slug: { contains: query, mode: "insensitive" as const } }] } } : {}),
        ...(status ? { status } : {}),
      },
      include: { company: { select: { name: true, slug: true } }, plan: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
    prisma.plan.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { priceCents: "asc" } }),
  ]);
  return <div className="content"><p className="eyebrow">Faturamento SaaS</p><h1 className="page-title">Assinaturas</h1><p className="page-subtitle">Planos, status e períodos das empresas. Alterações administrativas não geram cobranças.</p><form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><label className="text-xs font-semibold">Buscar empresa<input name="q" defaultValue={query} className="input mt-2" placeholder="Ex.: Ateliê ou atelie-da-ana"/></label>{status && <input type="hidden" name="status" value={status}/>}<button className="button self-end">Buscar assinaturas</button></form><div className="mt-4 flex flex-wrap gap-2">{[["Todas", ""], ["Em avaliação", "TRIALING"], ["Ativas", "ACTIVE"], ["Em atraso", "PAST_DUE"], ["Canceladas", "CANCELED"]].map(([label, value]) => <Link key={label} href={value ? `/admin/assinaturas?status=${value}` : "/admin/assinaturas"} className={`rounded-full border px-3 py-2 text-xs ${(filters.status ?? "") === value ? "border-[#177a56] bg-[#edf6f1] text-[#176b4c]" : "border-[#e0e7e2] bg-white text-[#68756d]"}`}>{label}</Link>)}</div><section className="card mt-4 overflow-hidden">{subscriptions.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Empresa</th><th className="hidden md:table-cell">Plano</th><th className="hidden md:table-cell">Preço</th><th className="hidden md:table-cell">Status</th><th className="hidden md:table-cell">Avaliação termina</th><th className="hidden md:table-cell">Período termina</th><th>Ações</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.id}><td className="font-semibold">{item.company.name}<span className="block text-[10px] font-normal text-[#87928b]">/loja/{item.company.slug}</span><span className="mt-1 flex flex-wrap items-center gap-1 md:hidden"><span className="badge">{item.plan.name}</span><span className="badge">{money(item.plan.priceCents)}/mês</span><span className="badge">{item.status}</span></span></td><td className="hidden md:table-cell">{item.plan.name}</td><td className="hidden md:table-cell">{money(item.plan.priceCents)}/mês</td><td className="hidden md:table-cell"><span className="badge">{item.status}</span></td><td className="hidden md:table-cell">{item.trialEndsAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.trialEndsAt) : "—"}</td><td className="hidden md:table-cell">{item.currentPeriodEndsAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.currentPeriodEndsAt) : "—"}</td><td><AdminSubscriptionManager subscription={{ id: item.id, companyName: item.company.name, companySlug: item.company.slug, planId: item.planId, status: item.status, trialEndsAt: item.trialEndsAt?.toISOString() ?? null, currentPeriodEndsAt: item.currentPeriodEndsAt?.toISOString() ?? null }} plans={plans}/></td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma assinatura encontrada para este filtro.</div>}</section><p className="mt-4 text-xs text-[#87928b]">Os pagamentos recorrentes não estão integrados; este painel não indica valores recebidos.</p></div>;
}
