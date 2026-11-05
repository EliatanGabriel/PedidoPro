import { authEmailConfigured } from "@/lib/email";
import { AccountEmailForm } from "@/components/account-email-form";
import { AuthNavbar } from "@/components/auth-navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recuperar senha — Ordexa", description: "Recupere o acesso à sua conta Ordexa informando o e-mail cadastrado." };

export default function RecoverPasswordPage() {
  return (
    <main className="min-h-screen place-items-center bg-[#f7f9f7] pt-16 px-5 py-12">
      <AuthNavbar />
      <section className="card w-full max-w-md p-7">
        <p className="eyebrow mt-8">Acesso à conta</p>
        <h1 className="mt-2 text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-6 text-[#748078]">
          Informe o e-mail usado no cadastro. Se a conta existir, enviaremos um link temporário.
        </p>
        <AccountEmailForm mode="recovery" enabled={authEmailConfigured} />
      </section>
    </main>
  );
}
