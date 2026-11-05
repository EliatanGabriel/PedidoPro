"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode, emailVerificationRequired = false }: { mode: "login" | "signup"; emailVerificationRequired?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = { email: String(form.get("email")), password: String(form.get("password")) };
    try {
      const result = mode === "login"
        ? await authClient.signIn.email(payload)
        : await authClient.signUp.email({ ...payload, name: String(form.get("name")), callbackURL: "/configurar-empresa" });
      if (result.error) {
        if (result.error.status === 403 && emailVerificationRequired) {
          setError("Confirme seu e-mail antes de entrar. Você pode solicitar um novo link abaixo.");
        } else if (result.error.status === 403) {
          setError(result.error.message || "Muitas tentativas. Tente novamente em alguns minutos.");
        } else {
          setError(result.error.message || "Não foi possível autenticar.");
        }
        return;
      }
      if (mode === "signup" && emailVerificationRequired) {
        router.push(`/verificar-email?email=${encodeURIComponent(payload.email)}`);
      } else if (mode === "login") {
        const session = await authClient.getSession();
        const platformRole = (session.data?.user as { platformRole?: string } | undefined)?.platformRole;
        router.push(platformRole === "PLATFORM_ADMIN" ? "/admin" : "/painel");
      } else {
        router.push("/configurar-empresa");
      }
      router.refresh();
    } catch {
      setError("Não foi possível contatar o serviço de autenticação. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} className="space-y-4">
    {mode === "signup" && <label className="block text-sm font-medium">Seu nome<input name="name" autoComplete="name" required minLength={2} className="input mt-2" placeholder="Ana Souza" /></label>}
    {mode === "signup" && (
      <label className="flex items-start items-baseline space-x-2">
        <input
          type="checkbox"
          name="terms"
          required
          minLength={1}
          className="checkbox mt-1 block h-4 w-4 text-[#177a56] rounded border"
        />
        <span className="text-sm text-[#6b7280]">
          Ao criar sua conta, você concorda com nossos <a href="/termos" className="font-medium underline text-[#177a56]">Termos de Serviço</a> e <a href="/politica-de-privacidade" className="font-medium underline text-[#177a56]">Política de Privacidade</a>.
        </span>
      </label>
    )}
    <label className="block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="email" required className="input mt-2" placeholder="voce@empresa.com" /></label>
    <label className="block text-sm font-medium">Senha<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} className="input mt-2" placeholder="Mínimo de 10 caracteres" /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <button disabled={busy} className="button w-full !py-3">{busy ? "Aguarde…" : mode === "login" ? "Entrar na conta" : "Criar conta"}</button>
  </form>;
}
