import { ResetPasswordForm } from "@/components/account-email-form";
import { AuthNavbar } from "@/components/auth-navbar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Redefinir senha — Ordexa", description: "Crie uma nova senha para acessar sua conta Ordexa." };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="min-h-screen place-items-center bg-[#f7f9f7] pt-16 px-5 py-12">
      <AuthNavbar />
      <section className="card w-full max-w-md p-7">
        <p className="eyebrow mt-8">Acesso à conta</p>
        <h1 className="mt-2 text-2xl font-bold">Crie uma nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-[#748078]">
          Escolha uma senha com pelo menos dez caracteres.
        </p>
        <ResetPasswordForm token={token ?? null} />
      </section>
    </main>
  );
}
