import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { AdminUserAction } from "@/components/admin-user-action";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const filters = await searchParams;
  const query = filters.q?.trim();
  const role = filters.role === "admin" ? "PLATFORM_ADMIN" : filters.role === "user" ? "USER" : undefined;
  const [users, admin] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { email: { contains: query, mode: "insensitive" as const } }] } : {}),
        ...(role ? { platformRole: role } : {}),
      },
      select: { id: true, name: true, email: true, platformRole: true, createdAt: true, memberships: { select: { role: true, company: { select: { name: true, slug: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    getPlatformAdmin(),
  ]);
  return <div className="content"><p className="eyebrow">Acessos</p><h1 className="page-title">Usuários</h1><p className="page-subtitle">Contas, empresas associadas e acesso administrativo da plataforma.</p><form className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><label className="text-xs font-semibold">Buscar nome ou e-mail<input name="q" defaultValue={query} className="input mt-2" placeholder="Ex.: Ana ou ana@empresa.com"/></label>{role && <input type="hidden" name="role" value={filters.role}/>}<button className="button self-end">Buscar usuários</button></form><div className="mt-4 flex flex-wrap gap-2">{[["Todos", ""], ["Admins", "admin"], ["Usuários", "user"]].map(([label, value]) => <Link key={label} href={value ? `/admin/usuarios?role=${value}` : "/admin/usuarios"} className={`rounded-full border px-3 py-2 text-xs ${(filters.role ?? "") === value ? "border-[#177a56] bg-[#edf6f1] text-[#176b4c]" : "border-[#e0e7e2] bg-white text-[#68756d]"}`}>{label}</Link>)}</div><section className="card mt-4 overflow-hidden">{users.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Nome</th><th className="hidden md:table-cell">E-mail</th><th className="hidden md:table-cell">Empresas</th><th className="hidden md:table-cell">Perfil plataforma</th><th className="hidden md:table-cell">Cadastro</th><th>Ação</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="font-semibold">{user.name}<span className="block text-[10px] font-normal text-[#87928b] md:hidden">{user.email}</span><span className="mt-1 block md:hidden"><span className="badge">{user.platformRole}</span></span></td><td className="hidden md:table-cell">{user.email}</td><td className="hidden md:table-cell">{user.memberships.length ? user.memberships.map((membership) => <span key={membership.company.slug} className="block text-xs">{membership.company.name} <span className="text-[10px] text-[#87928b]">({membership.role})</span></span>) : <span className="text-xs text-[#87928b]">Sem empresa</span>}</td><td className="hidden md:table-cell"><span className="badge">{user.platformRole}</span></td><td className="hidden md:table-cell">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(user.createdAt)}</td><td><AdminUserAction id={user.id} platformRole={user.platformRole} isSelf={admin?.id === user.id}/></td></tr>)}</tbody></table></div> : <div className="empty">Nenhum usuário encontrado para este filtro.</div>}</section></div>;
}
