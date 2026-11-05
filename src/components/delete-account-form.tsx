"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Input } from "@/components/ui";

export function DeleteAccountForm({ blockedReason }: { blockedReason: string | null }) {
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (confirmation !== "EXCLUIR") {
      setError('Digite "EXCLUIR" para confirmar a exclusão.');
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.deleteUser({ password });
      if (result.error) {
        setError(result.error.message || "Não foi possível excluir a conta.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Não foi possível excluir a conta. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (blockedReason) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Exclusão indisponível no momento</p>
      <p className="mt-2 leading-6">{blockedReason}</p>
    </div>;
  }

  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-xs font-semibold">
      Confirme sua senha
      <Input name="password" type="password" autoComplete="current-password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2" />
    </label>
    <label className="block text-xs font-semibold">
      Digite <strong>EXCLUIR</strong> para confirmar
      <Input name="confirmation" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2" placeholder="EXCLUIR" />
    </label>
    {error && <p role="alert" className="error">{error}</p>}
    <Button disabled={busy} variant="destructive">{busy ? "Excluindo…" : "Excluir minha conta"}</Button>
  </form>;
}
