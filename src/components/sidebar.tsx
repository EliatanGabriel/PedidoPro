import Link from "next/link";
import { BarChart3, Box, ClipboardList, Users, Store, CreditCard, Boxes, UserRound, Truck, Receipt, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { hasTenantPermission } from "@/lib/tenant-permissions";

const links = [
  { href: "/painel", label: "Visão geral", icon: BarChart3, permission: "view_orders" },
  { href: "/painel/pedidos", label: "Pedidos", icon: ClipboardList, permission: "view_orders" },
  { href: "/painel/pedidos/novo", label: "Novo pedido", icon: ClipboardList, permission: "create_orders" },
  { href: "/painel/produtos", label: "Produtos", icon: Box, permission: "view_products" },
  { href: "/painel/estoque", label: "Estoque", icon: Boxes, permission: "manage_stock" },
  { href: "/painel/entregas", label: "Entregas", icon: Truck, permission: "manage_deliveries" },
  { href: "/painel/clientes", label: "Clientes", icon: Users, permission: "manage_customers" },
  { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3, permission: "view_reports" },
  { href: "/painel/despesas", label: "Despesas", icon: Receipt, permission: "manage_expenses" },
];

export function Sidebar({ company, user, role, permissions, companyActive }: { company: string; user: string; role: string; permissions: unknown; companyActive: boolean }) {
  const allowed = (permission: string) => hasTenantPermission(role, permissions, companyActive, permission);
  const visibleLinks = links.filter((item) => allowed(item.permission));
  const firstHref = visibleLinks[0]?.href ?? "/painel";

  return <aside className="sidebar"><Link href={firstHref} className="brand">Ord<span>exa</span></Link><p className="nav-label">Menu principal</p><nav aria-label="Navegação principal">{visibleLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} className="nav-link"><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>{role === "OWNER" && <><p className="nav-label mt-5">Sua empresa</p><Link aria-label="Loja" className="nav-link" href="/painel/configuracoes"><Store size={17} strokeWidth={1.8} /><span>Loja</span></Link><Link aria-label="Equipe" className="nav-link" href="/painel/equipe"><UserRound size={17} strokeWidth={1.8} /><span>Equipe</span></Link><Link aria-label="Privacidade" className="nav-link" href="/painel/privacidade"><ShieldCheck size={17} strokeWidth={1.8} /><span>Privacidade</span></Link><Link aria-label="Assinatura" className="nav-link" href="/painel/assinatura"><CreditCard size={17} strokeWidth={1.8} /><span>Assinatura</span></Link></>}<div className="sidebar-bottom"><div className="mb-2 flex items-center gap-2 px-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ef] text-xs font-bold">{user.slice(0, 1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{user}</span><span className="block truncate text-[10px] text-[#89938c]">{company}</span></span></div><SignOutButton /></div></aside>;
}
