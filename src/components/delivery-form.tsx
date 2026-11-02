"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function DeliveryForm({ orderId, status, expectedAt, notes }: { orderId: string; status: string; expectedAt: string; notes: string }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError("");
    const result = await apiRequest(`/api/orders/${orderId}/delivery`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: data.get("status"), expectedAt: data.get("expectedAt") ? new Date(String(data.get("expectedAt"))).toISOString() : null, notes: data.get("notes") }) }, "Não foi possível atualizar a entrega.");
    setBusy(false); if (!result.ok) { setError(result.error); return; } router.refresh();
  }
  return <form onSubmit={submit} className="mt-4 space-y-3"><label className="block text-xs font-semibold">Status<select name="status" defaultValue={status} className="input mt-2">{[["AWAITING_PICKUP","Aguardando retirada"],["PREPARING","Em preparação"],["READY_FOR_PICKUP","Pronto para retirada"],["IN_TRANSIT","Em transporte"],["DELIVERED","Entregue"],["FAILED","Entrega não realizada"]].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label className="block text-xs font-semibold">Previsão<input name="expectedAt" type="datetime-local" defaultValue={expectedAt} className="input mt-2"/></label><label className="block text-xs font-semibold">Observações<textarea name="notes" rows={2} maxLength={500} defaultValue={notes} className="input mt-2"/></label>{error&&<p role="alert" className="error">{error}</p>}<button className="button secondary w-full" disabled={busy}>{busy?"Salvando…":"Atualizar entrega"}</button></form>;
}
