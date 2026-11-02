import Link from "next/link";
import { prisma } from "@/lib/prisma";

const pageSize = 50;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ q?: string; company?: string; page?: string }> }) {
  const filters = await searchParams;
  const query = filters.q?.trim();
  const company = filters.company?.trim();
  const requestedPage = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const where = {
    ...(query ? { OR: [{ action: { contains: query, mode: "insensitive" as const } }, { entity: { contains: query, mode: "insensitive" as const } }, { entityId: { contains: query, mode: "insensitive" as const } }] } : {}),
    ...(company ? { companyId: company } : {}),
  };
  const [total, companies] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const logs = await prisma.auditLog.findMany({ where, include: { company: { select: { name: true } }, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize });
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (company) params.set("company", company);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `/admin/auditoria?${search}` : "/admin/auditoria";
  };
  return <div className="content"><p className="eyebrow">Segurança e operação</p><h1 className="page-title">Auditoria</h1><p className="page-subtitle">{total} evento{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"}. Exibindo a página {page} de {totalPages}.</p><form className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_260px_auto]"><label className="text-xs font-semibold">Buscar ação, entidade ou identificador<input name="q" defaultValue={query} className="input mt-2" placeholder="Ex.: billing, Order ou cm..."/></label><label className="text-xs font-semibold">Empresa<select name="company" defaultValue={company ?? ""} className="input mt-2"><option value="">Todas as empresas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="button self-end">Filtrar eventos</button></form><section className="card mt-4 overflow-hidden">{logs.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th className="hidden md:table-cell">Data</th><th>Ação</th><th className="hidden md:table-cell">Entidade</th><th className="hidden md:table-cell">Empresa</th><th className="hidden md:table-cell">Usuário</th><th className="hidden md:table-cell">Detalhes</th></tr></thead><tbody>{logs.map((log) => { const metadata = log.metadata ? JSON.stringify(log.metadata) : ""; return <tr key={log.id}><td className="hidden md:table-cell">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}</td><td className="font-semibold">{log.action}<span className="mt-1 block text-[10px] font-normal text-[#87928b] md:hidden">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)}</span><span className="block text-[10px] font-normal text-[#87928b] md:hidden">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</span><span className="block text-[10px] font-normal text-[#87928b] md:hidden">{log.company?.name ?? "—"}</span></td><td className="hidden md:table-cell">{log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td><td className="hidden md:table-cell">{log.company?.name ?? "—"}</td><td className="hidden md:table-cell">{log.user?.email ?? "Sistema público"}</td><td className="hidden max-w-64 truncate text-xs text-[#87928b] md:table-cell" title={metadata}>{metadata || "—"}</td></tr>; })}</tbody></table></div> : <div className="empty">Nenhum evento encontrado para este filtro.</div>}</section><nav aria-label="Paginação da auditoria" className="mt-4 flex items-center justify-between text-xs"><Link aria-disabled={page <= 1} className={`button secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={href(page - 1)}>Anterior</Link><span className="text-[#87928b]">Página {page} de {totalPages}</span><Link aria-disabled={page >= totalPages} className={`button secondary ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`} href={href(page + 1)}>Próxima</Link></nav></div>;
}
