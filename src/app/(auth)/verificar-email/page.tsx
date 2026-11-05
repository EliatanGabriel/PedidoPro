import { authEmailConfigured } from "@/lib/email";
import { AccountEmailForm } from "@/components/account-email-form";
import { AuthNavbar } from "@/components/auth-navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verificar e-mail — Ordexa", description: "Confirme seu endereço de e-mail para ativar a conta Ordexa." };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="min-h-screen place-items-center bg-[#f7f9f7] pt-16 px-5 py-12">
      <AuthNavbar />
      <section className="card w-full max-w-md p-7">
        <p className="eyebrow mt-8">Confirmação da conta</p>
        <h1 className="mt-2 text-2xl font-bold">Verifique seu e-mail</h1>
        <p className="mt-2 text-sm leading-6 text-[#748078]">
          Use o link enviado para confirmar o endereço. Ele expira após uma hora.
        </p>
        <AccountEmailForm mode="verification" enabled={authEmailConfigured} initialEmail={email ?? ""} />
      </section>
    </main>
  );
}
