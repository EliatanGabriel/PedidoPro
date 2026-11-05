"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input, Select } from "@/components/ui";

type Plan = { id: string; name: string; isActive: boolean };
type Subscription = { id: string; companyName: string; companySlug: string; planId: string; status: string; trialEndsAt: string | null; currentPeriodEndsAt: string | null };
function localInput(value: string | null) { return value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ""; }

export function AdminSubscriptionManager({ subscription, plans }: { subscription: Subscription; plans: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [open]);

  function openDialog() {
    setError("");
    setSaved(false);
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setSaved(false); setError("");
    const asIso = (key: string) => { const value = String(form.get(key) ?? ""); return value ? new Date(value).toISOString() : null; };
    try {
      const response = await fetch(`/api/admin/subscriptions/${subscription.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: form.get("planId"), status: form.get("status"), trialEndsAt: asIso("trialEndsAt"), currentPeriodEndsAt: asIso("currentPeriodEndsAt") }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Não foi possível atualizar a assinatura."); return; }
      setSaved(true); router.refresh();
    } catch {
      setError("Falha de conexão ao atualizar a assinatura.");
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={openDialog} className="text-xs font-semibold text-[#177a56]">Gerenciar</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`subscription-title-${subscription.id}`} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#e3e9e4] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id={`subscription-title-${subscription.id}`} className="font-semibold">Gerenciar assinatura</h2><p className="mt-1 text-xs text-[#87928b]">{subscription.companyName} · /loja/{subscription.companySlug}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded p-1 text-[#748078] hover:bg-[#f0f4f1]"><X size={18}/></button>
        </div>
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="text-xs">Plano<Select name="planId" defaultValue={subscription.planId} className="mt-1">{plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></label>
          <label className="text-xs">Status<Select name="status" defaultValue={subscription.status} className="mt-1"><option value="TRIALING">Em avaliação</option><option value="ACTIVE">Ativa</option><option value="PAST_DUE">Em atraso</option><option value="CANCELED">Cancelada</option></Select></label>
          <label className="text-xs">Fim da avaliação<Input type="datetime-local" name="trialEndsAt" defaultValue={localInput(subscription.trialEndsAt)} className="mt-1"/></label>
          <label className="text-xs">Fim do período atual<Input type="datetime-local" name="currentPeriodEndsAt" defaultValue={localInput(subscription.currentPeriodEndsAt)} className="mt-1"/></label>
          {error && <p role="alert" className="error">{error}</p>}
          {saved && <p role="status" className="text-xs text-[#177a56]">Assinatura atualizada.</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-1"><button type="button" onClick={() => setOpen(false)} className="button secondary">Fechar</button><button disabled={busy} className="button">{busy ? "Salvando…" : "Salvar alterações"}</button></div>
          <p className="text-[10px] leading-4 text-[#748078]">Alteração administrativa manual. Não gera cobrança nem confirma pagamento.</p>
        </form>
      </div>
    </div>}
  </>;
}
