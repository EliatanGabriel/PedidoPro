"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";

type Product = { id: string; name: string; priceCents: number; stock: number };
type Customer = { id: string; name: string; phone: string | null };
type Item = { productId: string | null; productName: string; quantity: number };

export function OrderEditForm({ order, products, customers }: {
  order: { id: string; status: string; customerId: string | null; recipientName: string | null; recipientPhone: string | null; paymentMethod: string | null; fulfillment: string; discountCents: number; deliveryCents: number; deliveryAddress: string | null; notes: string | null; items: Item[] };
  products: Product[];
  customers: Customer[];
}) {
  const [items, setItems] = useState(() => order.items.flatMap((item) => item.productId && products.some((product) => product.id === item.productId) ? [{ productId: item.productId, quantity: item.quantity }] : []));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [discount, setDiscount] = useState(order.discountCents / 100);
  const [deliveryFee, setDeliveryFee] = useState(order.deliveryCents / 100);
  const router = useRouter();
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (products.find((product) => product.id === item.productId)?.priceCents ?? 0) * item.quantity, 0), [items, products]);

  function addItem() {
    const available = products.find((product) => !items.some((item) => item.productId === product.id));
    if (available) setItems((current) => [...current, { productId: available.id, quantity: 1 }]);
  }
  function updateItem(index: number, next: Partial<(typeof items)[number]>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...next } : item));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: form.get("customerId") || null, recipientName: form.get("recipientName") || undefined, recipientPhone: form.get("recipientPhone") || undefined, paymentMethod: form.get("paymentMethod") || null, fulfillment: form.get("fulfillment"), discountCents: Math.round(Number(form.get("discount") || 0) * 100), deliveryCents: Math.round(Number(form.get("deliveryFee") || 0) * 100), deliveryAddress: form.get("deliveryAddress") || undefined, notes: form.get("notes") || undefined, items }),
      });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Não foi possível atualizar o pedido."); return; }
      router.refresh();
    } catch {
      setError("Falha de conexão ao salvar o pedido.");
    } finally {
      setBusy(false);
    }
  }

  return <details className="card p-5"><summary className="cursor-pointer text-sm font-semibold text-[#177a56]">Editar pedido</summary><form onSubmit={submit} className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]"><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Cliente<select name="customerId" defaultValue={order.customerId ?? ""} className="input mt-2"><option value="">Venda rápida</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></label><label className="text-xs font-semibold">Pagamento<select name="paymentMethod" defaultValue={order.paymentMethod ?? ""} className="input mt-2"><option value="">A definir</option><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="BANK_TRANSFER">Transferência</option><option value="OTHER">Outro</option></select></label><label className="text-xs font-semibold">Tipo<select name="fulfillment" defaultValue={order.fulfillment} className="input mt-2"><option value="PICKUP">Retirada</option><option value="DELIVERY">Entrega</option></select></label><label className="text-xs font-semibold">Endereço<input name="deliveryAddress" defaultValue={order.deliveryAddress ?? ""} maxLength={300} className="input mt-2" /></label><label className="text-xs font-semibold">Destinatário<input name="recipientName" defaultValue={order.recipientName ?? ""} maxLength={120} className="input mt-2" /></label><label className="text-xs font-semibold">Telefone do destinatário<input name="recipientPhone" defaultValue={order.recipientPhone ?? ""} maxLength={30} className="input mt-2" /></label></div><div className="rounded-lg border border-[#edf0ed] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Itens</h3><button type="button" onClick={addItem} disabled={items.length >= products.length} className="button secondary">Adicionar</button></div><div className="mt-3 space-y-2">{items.map((item, index) => { const product = products.find((entry) => entry.id === item.productId); return <div key={`${item.productId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_90px_auto]"><select aria-label="Produto" value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })} className="input">{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {money(entry.priceCents)} · estoque {entry.stock}</option>)}</select><input aria-label="Quantidade" type="number" min="1" max={product ? product.stock + (order.items.find((old) => old.productId === product.id)?.quantity ?? 0) : 999} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} className="input"/><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-xs font-semibold text-red-700">Remover</button></div>; })}</div></div><label className="text-xs font-semibold">Observações<textarea name="notes" rows={2} maxLength={1000} defaultValue={order.notes ?? ""} className="input mt-2"/></label></div><aside className="space-y-3 rounded-lg bg-[#f8faf8] p-4"><label className="block text-xs font-semibold">Desconto (R$)<input name="discount" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} className="input mt-2"/></label><label className="block text-xs font-semibold">Taxa de entrega (R$)<input name="deliveryFee" type="number" min="0" step="0.01" value={deliveryFee} onChange={(event) => setDeliveryFee(Number(event.target.value))} className="input mt-2"/></label><div className="border-t border-[#e3e9e4] pt-3 text-xs"><div className="flex justify-between"><span>Subtotal atual</span><span>{money(subtotal)}</span></div><p className="mt-2 flex justify-between font-bold"><span>Total estimado</span><span>{money(Math.max(0, subtotal - Math.round(discount * 100) + Math.round(deliveryFee * 100)))}</span></p><p className="mt-2 text-[10px] text-[#748078]">O servidor recalcula preços e estoque antes de salvar.</p></div>{error && <p role="alert" className="error">{error}</p>}<button disabled={busy || items.length === 0} className="button w-full">{busy ? "Salvando…" : "Salvar alterações"}</button></aside></form></details>;
}
