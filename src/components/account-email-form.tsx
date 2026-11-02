"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AccountEmailForm({ mode, enabled, initialEmail = "" }: { mode: "recovery" | "verification"; enabled: boolean; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!enabled) {
      setError("O envio de e-mails ainda não está configurado para esta aplicação.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "recovery"
        ? await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/redefinir-senha` })
        : await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/configurar-empresa` });
      if (result.error) {
        setError(result.error.message || "Não foi possível processar a solicitação.");
        return;
      }
      setMessage(mode === "recovery"
        ? "Se houver uma conta com esse endereço, enviaremos as instruções de redefinição."
        : "Se houver uma conta pendente de confirmação, enviaremos um novo link de verificação.");
    } catch {
      setError("Não foi possível contatar o serviço de e-mail. Tente novamente mais tarde.");
    } finally {
      setBusy(false);
    }
  }

  const isRecovery = mode === "recovery";
  return <div>
    {!enabled && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">O serviço de e-mail ainda não está configurado. A recuperação e a confirmação de contas estão indisponíveis.</p>}
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-medium">E-mail<input name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-2" placeholder="voce@empresa.com" /></label>
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-[#edf6f1] p-3 text-xs leading-5 text-[#176b4c]">{message}</p>}
      <button disabled={busy || !enabled} className="button w-full">{busy ? "Enviando…" : isRecovery ? "Enviar instruções" : "Reenviar confirmação"}</button>
    </form>
    <p className="mt-5 text-center text-sm text-[#748078]"><Link className="font-semibold text-[#177a56]" href="/login">Voltar para entrar</Link></p>
  </div>;
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) { setError("O link está incompleto ou inválido. Solicite uma nova redefinição."); return; }
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password !== confirmation) { setError("As senhas não coincidem."); return; }
    setBusy(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) { setError(result.error.message || "O link expirou ou já foi utilizado."); return; }
      setMessage("Senha atualizada. Você já pode entrar com a nova senha.");
    } catch {
      setError("Não foi possível redefinir a senha. Solicite um novo link.");
    } finally {
      setBusy(false);
    }
  }

  return <div><form onSubmit={submit} className="mt-5 space-y-4">
    <label className="block text-sm font-medium">Nova senha<input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required className="input mt-2" /></label>
    <label className="block text-sm font-medium">Confirme a nova senha<input name="confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required className="input mt-2" /></label>
    {error && <p role="alert" className="error">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-[#edf6f1] p-3 text-xs leading-5 text-[#176b4c]">{message} <Link className="font-semibold underline" href="/login">Entrar</Link></p>}
    <button disabled={busy || !token} className="button w-full">{busy ? "Atualizando…" : "Redefinir senha"}</button>
  </form><p className="mt-5 text-center text-sm text-[#748078]"><Link className="font-semibold text-[#177a56]" href="/login">Voltar para entrar</Link></p></div>;
}
