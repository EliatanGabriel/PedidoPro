"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("ui.unhandled_error", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-white px-5">
      <section className="max-w-lg text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#a33]">Algo deu errado</p>
        <h1 className="mt-3 text-3xl font-bold">Não foi possível concluir esta ação.</h1>
        <p className="mt-3 text-sm leading-6 text-[#748078]">
          Tente novamente. Se o problema persistir, entre em contato com o suporte informando o código abaixo.
        </p>
        {error.digest && <p className="mt-3 font-mono text-xs text-[#9ca3af]">Código: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className="button">Tentar novamente</button>
          <Link href="/" className="button button-secondary">Voltar ao início</Link>
        </div>
      </section>
    </main>
  );
}
