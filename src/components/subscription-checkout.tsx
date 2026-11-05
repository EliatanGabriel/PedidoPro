"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isCaktoCheckoutUrl } from "@/lib/cakto";
import { Button } from "@/components/ui";

type PlanOption = { id: string; name: string; priceCents: number };

export function SubscriptionCheckout({ plans, configured, canCancel }: { plans: PlanOption[]; configured: boolean; canCancel: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function checkout(planId: string) {
    setLoading(planId);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
      const result = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl || !isCaktoCheckoutUrl(result.checkoutUrl)) throw new Error(result.error ?? "Checkout do provedor inválido.");
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o checkout.");
      setLoading(null);
    }
  }

  async function cancelSubscription() {
    if (!window.confirm("Confirmar o cancelamento da assinatura recorrente? O acesso pago será encerrado conforme o status do provedor.")) return;
    setLoading("cancel");
    setError("");
    try {
      const response = await fetch("/api/billing/cancel", { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível cancelar.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível cancelar.");
      setLoading(null);
    }
  }

  return <div className="mt-6 border-t border-[#e9eeea] pt-5"><h3 className="font-semibold">Mudar de plano</h3><p className="mt-1 text-xs text-[#748078]">O plano só muda após confirmação do pagamento na Cakto.</p>      {plans.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{plans.map((plan) => <Button key={plan.id} type="button" variant="secondary" disabled={!configured || loading !== null} onClick={() => checkout(plan.id)} className="flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"><span>{loading === plan.id ? "Abrindo checkout…" : plan.name}</span><span>R$ {(plan.priceCents / 100).toFixed(2).replace(".", ",")}/mês</span></Button>)}</div>}{canCancel && <button type="button" className="mt-4 text-xs text-red-700 underline disabled:opacity-50" disabled={loading !== null} onClick={cancelSubscription}>{loading === "cancel" ? "Cancelando…" : "Cancelar assinatura recorrente"}</button>}{!configured && <p className="mt-3 text-xs text-amber-800">Checkout indisponível até configurar o acesso e o webhook da Cakto.</p>}{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}</div>;
}
