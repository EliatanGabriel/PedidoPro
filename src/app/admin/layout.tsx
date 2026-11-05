import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Building2, CreditCard, LayoutDashboard, Package, ScrollText, Users } from "lucide-react";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/planos", label: "Planos", icon: Package },
  { href: "/admin/operacoes", label: "Operações", icon: Activity },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/login");
  return <div className="shell"><aside className="sidebar"><div className="brand flex items-center gap-2"><Logo width={30} height={17}/><small className="mt-1 hidden text-[9px] font-bold uppercase tracking-widest text-[#8a958e] md:block">Plataforma</small></div><nav aria-label="Administração">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-label={label} title={label} className="nav-link"><Icon size={17} strokeWidth={1.8}/><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><p className="mb-1 hidden truncate px-2 text-xs font-semibold md:block">{admin.name}</p><Link href="/painel" className="mb-1 hidden px-2 text-xs font-semibold text-[#177a56] md:block">Painel da empresa</Link><Link href="/" className="mb-2 hidden px-2 text-xs text-[#87928b] md:block">Ver site</Link><SignOutButton/></div></aside><main className="main"><header className="topbar"><span className="truncate text-xs font-semibold text-[#56645b]">Administração da plataforma</span><div className="flex items-center gap-3"><span className="hidden md:block"><span className="badge">Acesso restrito</span></span><ThemeToggle/></div></header>{children}</main></div>;
}
