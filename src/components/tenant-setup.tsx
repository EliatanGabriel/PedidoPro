"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button, Card, Input } from "@/components/ui";

export function TenantSetup() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget); const name = String(form.get("name"));
    const slug = String(form.get("slug")).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const result = await apiRequest("/api/company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, slug }) }, "Não foi possível criar a empresa.");
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    router.push("/painel"); router.refresh();
  }
  return <Card className="mx-auto mt-8 max-w-lg p-6"><form onSubmit={submit} className="space-y-5">
    <div className="block text-sm font-medium">Nome da empresa<Input name="name" required minLength={2} maxLength={80} className="mt-2" placeholder="Ateliê da Ana" /></div>
    <div className="block text-sm font-medium">Endereço público da loja<div className="mt-2 flex items-center gap-2"><span className="text-xs text-[#748078]">ordexa.com.br/loja/</span><Input name="slug" required minLength={3} maxLength={40} placeholder="atelie-da-ana" /></div></div>
    {error && <p role="alert" className="error">{error}</p>}
    <Button disabled={busy}>{busy ? "Criando empresa…" : "Criar minha empresa"}</Button>
  </form></Card>;
}
