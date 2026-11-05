import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página não encontrada - Ordexa",
  description: "A página que você procurou não existe.",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="inline-flex -mb-8 items-center rounded-full bg-[#177a56] px-8 py-8 text-5xl font-extrabold text-white">
          404
        </div>

        <h1 className="mb-2 text-4xl font-bold text-[#177a56]">Página não encontrada</h1>
        <p className="mb-6 text-[#6b7280]">
          Desculpe, a página que você está procurando não existe ou foi removida.
        </p>

        <div className="flex justify-center gap-2">
          <Link href="/" className="button button-secondary">
            Voltar ao início
          </Link>
          <Link href="/login" className="button">
            Entrar na conta
          </Link>
        </div>

        <p className="mt-8 text-sm text-[#9ca3af]">
          Se o problema persistir, por favor entre em contato com o suporte.
        </p>
      </div>
    </main>
  );
}
