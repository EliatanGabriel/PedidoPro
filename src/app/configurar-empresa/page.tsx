import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TenantSetup } from "@/components/tenant-setup";

export default async function SetupCompanyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <main className="min-h-screen px-5 py-14"><div className="mx-auto max-w-lg"><Link className="text-xl font-extrabold" href="/">Pedido<span className="text-[#177a56]">Pro</span></Link><p className="mt-10 text-xs font-bold uppercase tracking-widest text-[#177a56]">Quase lá</p><h1 className="mt-3 text-3xl font-bold">Configure sua empresa</h1><p className="mt-2 text-sm text-[#748078]">Esses dados identificam sua operação dentro do PedidoPro.</p><TenantSetup /></div></main>;
}
