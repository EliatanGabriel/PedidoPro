import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getTenantContext();
  if (!context) redirect("/configurar-empresa");
  if (!context.company.isActive) return <main className="grid min-h-screen place-items-center px-5"><section className="card max-w-lg p-8"><p className="text-xs font-bold uppercase tracking-widest text-[#a33]">Acesso suspenso</p><h1 className="mt-3 text-2xl font-bold">A empresa está temporariamente bloqueada.</h1><p className="mt-3 text-sm leading-6 text-[#748078]">Entre em contato com o administrador da plataforma para obter mais informações.</p></section></main>;
  return <div className="shell"><Sidebar company={context.company.name} user={context.user.name} role={context.membership.role} permissions={context.membership.permissions} companyActive={context.company.isActive}/><main className="main"><header className="topbar"><span className="truncate text-xs text-[#748078]">Visão geral da operação</span><div className="flex items-center gap-3"><span className="hidden text-xs text-[#748078] sm:inline">{context.company.name}</span><ThemeToggle/><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f2ec] text-xs font-bold text-[#276849]">{context.user.name.slice(0, 1).toUpperCase()}</span></div></header>{children}</main></div>;
}
