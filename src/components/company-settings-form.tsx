"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea } from "@/components/ui";

const methods = [["PIX", "PIX"], ["CASH", "Dinheiro"], ["CREDIT_CARD", "Cartão de crédito"], ["DEBIT_CARD", "Cartão de débito"], ["BANK_TRANSFER", "Transferência bancária"], ["OTHER", "Outros"]];
type Settings = { name: string; slug: string; description: string | null; phone: string | null; email: string | null; logoUrl: string | null; businessHours: string | null; deliveryFeeCents: number; acceptsPickup: boolean; acceptsDelivery: boolean; publicPaymentMethods: string[]; allowNegativeStock: boolean };

export function CompanySettingsForm({ initial }: { initial: Settings }) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const data = {
      name: form.get("name"), slug: form.get("slug"), description: form.get("description"), phone: form.get("phone"), email: form.get("email"), logoUrl: form.get("logoUrl"), businessHours: form.get("businessHours"),
      deliveryFeeCents: Math.round(Number(form.get("deliveryFee") || 0) * 100), acceptsPickup: form.get("acceptsPickup") === "on", acceptsDelivery: form.get("acceptsDelivery") === "on",
      publicPaymentMethods: methods.map(([value]) => value).filter((value) => form.get(`payment-${value}`) === "on"), allowNegativeStock: form.get("allowNegativeStock") === "on",
    };
    try {
      const response = await fetch("/api/company/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await response.json();
      if (!response.ok) { setError(body.error); return; }
      setSaved(true); router.refresh();
    } catch {
      setError("Falha de conexão ao salvar as configurações.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Nome comercial<Input name="name" defaultValue={initial.name} required maxLength={80} className="mt-2"/></label><label className="text-xs font-semibold">Telefone<Input name="phone" defaultValue={initial.phone??""} maxLength={30} className="mt-2"/></label></div>
    <label className="block text-xs font-semibold">Identificador da loja<Input name="slug" defaultValue={initial.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={40} className="mt-2"/><span className="mt-1 block font-normal text-[#87928b]">Endereço público: /loja/{initial.slug}</span></label>
    <label className="block text-xs font-semibold">Descrição<Textarea name="description" defaultValue={initial.description??""} maxLength={1000} rows={3} className="mt-2"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">E-mail comercial<Input name="email" type="email" defaultValue={initial.email??""} className="mt-2"/></label><label className="text-xs font-semibold">Logotipo (URL)<Input name="logoUrl" type="url" defaultValue={initial.logoUrl??""} placeholder="https://…" className="mt-2"/></label></div>
    <label className="block text-xs font-semibold">Horário de funcionamento<Textarea name="businessHours" defaultValue={initial.businessHours??""} maxLength={500} rows={3} className="mt-2" placeholder="Segunda a sexta: 9h às 18h&#10;Sábado: 9h às 13h"/><span className="mt-1 block font-normal text-[#87928b]">Esse texto será exibido na página pública.</span></label>
    <section className="rounded-lg border border-[#e6ece7] p-4"><h2 className="text-sm font-semibold">Pedidos públicos</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs"><input name="acceptsPickup" type="checkbox" defaultChecked={initial.acceptsPickup}/>Aceita retirada</label><label className="flex items-center gap-2 text-xs"><input name="acceptsDelivery" type="checkbox" defaultChecked={initial.acceptsDelivery}/>Aceita entrega</label><label className="text-xs font-semibold">Taxa de entrega (R$)<Input name="deliveryFee" type="number" min="0" step="0.01" defaultValue={(initial.deliveryFeeCents/100).toFixed(2)} className="mt-2"/></label></div><fieldset className="mt-4"><legend className="text-xs font-semibold">Formas de pagamento informadas ao cliente</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{methods.map(([value,label])=><label key={value} className="flex items-center gap-2 text-xs"><input name={`payment-${value}`} type="checkbox" defaultChecked={initial.publicPaymentMethods.includes(value)}/>{label}</label>)}</div></fieldset></section>
    <label className="flex items-start gap-3 rounded-lg bg-[#fff9e9] p-3 text-xs"><input name="allowNegativeStock" type="checkbox" defaultChecked={initial.allowNegativeStock} className="mt-0.5"/><span><strong>Permitir estoque negativo</strong><span className="mt-1 block font-normal text-[#748078]">Ative somente se sua operação vende sob encomenda. A alteração será registrada na auditoria.</span></span></label>
    {error&&<p role="alert" className="error">{error}</p>}{saved&&<p role="status" className="text-xs text-[#177a56]">Configurações salvas.</p>}<Button disabled={busy}>{busy?"Salvando…":"Salvar configurações"}</Button>
  </form>;
}
