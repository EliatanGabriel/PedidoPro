import { authEmailConfigured } from "@/lib/email";
import { AccountEmailForm } from "@/components/account-email-form";
import { Logo } from "@/components/logo";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-[#f7f9f7] px-5 py-12"><section className="card w-full max-w-md p-7"><Logo className="mb-4" width={30} height={17}/><p className="eyebrow mt-8">Confirmação da conta</p><h1 className="mt-2 text-2xl font-bold">Verifique seu e-mail</h1><p className="mt-2 text-sm leading-6 text-[#748078]">Use o link enviado para confirmar o endereço. Ele expira após uma hora.</p><AccountEmailForm mode="verification" enabled={authEmailConfigured} initialEmail={email ?? ""}/></section></main>;
}
