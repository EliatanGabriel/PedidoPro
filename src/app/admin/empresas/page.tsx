import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminCompanyAction } from "@/components/admin-company-action";

export default async function AdminCompaniesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const filters = await searchParams;
  const query = filters.q?.trim();
  const status = filters.status === "active" ? true : filters.status === "blocked" ? false : undefined;
  const companies = await prisma.company.findMany({
    where: {
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { slug: { contains: query, mode: "insensitive" as const } }] } : {}),
      ...(status === undefined ? {} : { isActive: status }),
    },
    include: { _count: { select: { members: true, orders: true, products: true } }, subscription: { include: { plan: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return <div className="content"><p className="eyebrow">Contas SaaS</p><h1 className="page-title">Empresas</h1><p className="page-subtitle">Empresas, plano associado, uso acumulado e acesso à assinatura.</p><form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><label className="text-xs font-semibold">Buscar nome ou endereço<input name="q" defaultValue={query} className="input mt-2" placeholder="Ex.: Ateliê ou atelie-da-ana"/></label>{status !== undefined && <input type="hidden" name="status" value={filters.status}/>}<button className="button self-end">Buscar empresas</button></form><div className="mt-4 flex flex-wrap gap-2">{[["Todas", ""], ["Ativas", "active"], ["Bloqueadas", "blocked"]].map(([label, value]) => <Link key={label} href={value ? `/admin/empresas?status=${value}` : "/admin/empresas"} className={`rounded-full border px-3 py-2 text-xs ${(filters.status ?? "") === value ? "border-[#177a56] bg-[#edf6f1] text-[#176b4c]" : "border-[#e0e7e2] bg-white text-[#68756d]"}`}>{label}</Link>)}</div><section className="card mt-4 overflow-hidden">{companies.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Empresa</th><th className="hidden md:table-cell">Plano</th><th className="hidden md:table-cell">Usuários</th><th className="hidden md:table-cell">Pedidos</th><th className="hidden md:table-cell">Produtos</th><th className="hidden md:table-cell">Status</th><th>Ações</th></tr></thead><tbody>{companies.map((company) => <tr key={company.id}><td><Link href={`/admin/empresas/${company.id}`} className="font-semibold text-[#177a56]">{company.name}</Link><span className="block text-[10px] text-[#87928b]">/loja/{company.slug}</span><span className="mt-1 flex flex-wrap items-center gap-1 md:hidden"><span className="badge">{company.subscription?.plan.name ?? "Sem plano"}</span><span className="badge">{company.isActive ? "Ativa" : "Bloqueada"}</span></span></td><td className="hidden md:table-cell">{company.subscription?.plan.name ?? "—"}</td><td className="hidden md:table-cell">{company._count.members}</td><td className="hidden md:table-cell">{company._count.orders}</td><td className="hidden md:table-cell">{company._count.products}</td><td className="hidden md:table-cell"><span className="badge">{company.isActive ? "Ativa" : "Bloqueada"}</span></td><td className="space-y-1"><Link className="block text-xs font-semibold text-[#177a56]" href={`/admin/empresas/${company.id}`}>Ver detalhes</Link><AdminCompanyAction id={company.id} isActive={company.isActive}/><Link className="block text-xs font-semibold text-[#177a56]" href={`/admin/assinaturas?q=${encodeURIComponent(company.slug)}`}>Gerenciar assinatura</Link></td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma empresa encontrada para este filtro.</div>}</section></div>;
}
