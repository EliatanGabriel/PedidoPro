"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { orderStatusLabel } from "@/lib/format";
import { apiRequest } from "@/lib/api-client";
import { Button, Input, Select, Textarea } from "@/components/ui";

const nextOrderStatus: Record<string, string[]> = {
  NEW: ["AWAITING_PAYMENT", "PAYMENT_APPROVED", "PREPARING", "CANCELED"],
  AWAITING_PAYMENT: ["PAYMENT_APPROVED", "CANCELED"],
  PAYMENT_APPROVED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELED"],
  READY_FOR_PICKUP: ["COMPLETED", "OUT_FOR_DELIVERY", "CANCELED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELED"],
};

export function OrderStatusForm({ id, status }: { id: string; status: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const nextStatus = String(new FormData(event.currentTarget).get("status"));
    const result = await apiRequest(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }, "Não foi possível atualizar o pedido.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const options = nextOrderStatus[status] ?? [];
  return <form onSubmit={update} className="flex flex-wrap items-center gap-2">
    <Select name="status" aria-label="Novo status do pedido" className="!w-auto" disabled={busy || options.length === 0}>
      {options.map((value) => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}
    </Select>
    <Button variant="secondary" disabled={busy || options.length === 0}>{busy ? "Atualizando…" : "Atualizar status"}</Button>
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
  </form>;
}

export function PaymentForm({ id, remainingCents }: { id: string; remainingCents: number }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/orders/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: Math.round(Number(form.get("amount")) * 100), method: form.get("method"), transactionReference: form.get("reference") || undefined }),
    }, "Não foi possível registrar o recebimento.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    element.reset();
    router.refresh();
  }

  return <form onSubmit={submit} className="space-y-3">
    <div className="block text-xs font-semibold">Valor recebido (R$)<Input name="amount" type="number" min="0.01" max={remainingCents / 100} step="0.01" required className="mt-2" /></div>
    <div className="block text-xs font-semibold">Forma de pagamento<Select name="method" required className="mt-2"><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="BANK_TRANSFER">Transferência</option><option value="OTHER">Outro</option></Select></div>
    <div className="block text-xs font-semibold">Identificador da transação<Input name="reference" maxLength={120} className="mt-2" /></div>
    {error && <p role="alert" className="error">{error}</p>}
    <Button disabled={busy || remainingCents <= 0} className="w-full">{busy ? "Registrando…" : "Registrar recebimento"}</Button>
    <p className="text-[10px] leading-4 text-[#87928b]">Registro manual para conciliação. Nenhuma cobrança é processada pelo Ordexa.</p>
  </form>;
}

export function RefundPaymentForm({ orderId, paymentId, amountCents }: { orderId: string; paymentId: string; amountCents: number }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(`Registrar estorno manual de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountCents / 100)}? Nenhum gateway será acionado.`)) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const result = await apiRequest(`/api/orders/${orderId}/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: form.get("reason"), reference: form.get("reference") || undefined }),
    }, "Não foi possível registrar o estorno.");
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return <details className="mt-2"><summary className="cursor-pointer text-[11px] font-semibold text-red-700">Registrar estorno manual</summary><form onSubmit={submit} className="mt-2 space-y-2">
    <div className="block text-[11px]">Motivo<Textarea name="reason" required minLength={3} maxLength={500} rows={2} className="mt-1" /></div>
    <div className="block text-[11px]">Referência do estorno (opcional)<Input name="reference" maxLength={120} className="mt-1" /></div>
    {error && <p role="alert" className="error">{error}</p>}
    <Button variant="secondary" disabled={busy}>{busy ? "Registrando…" : "Confirmar estorno"}</Button>
    <p className="text-[10px] leading-4 text-[#748078]">Este registro atualiza o Ordexa, mas não solicita o estorno à operadora.</p>
  </form></details>;
}
