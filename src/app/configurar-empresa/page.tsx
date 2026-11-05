import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { TenantSetup } from "@/components/tenant-setup";

export default async function SetupCompanyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <main className="min-h-screen px-5 py-14"><div className="mx-auto max-w-lg"><Logo className="mb-3" width={30} height={17}/><p className="mt-10 text-xs font-bold uppercase tracking-widest text-[#177a56]">Quase lá</p><h1 className="mt-3 text-3xl font-bold">Configure sua empresa</h1><p className="mt-2 text-sm text-[#748078]">Esses dados identificam sua operação dentro do Ordexa.</p><TenantSetup /></div></main>;
}
