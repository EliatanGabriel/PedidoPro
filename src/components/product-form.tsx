"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { Button, Input, Select, Textarea } from "@/components/ui";

export function ProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; setBusy(true); setError(""); const form = new FormData(element);
    const result = await apiRequest("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), description: form.get("description"), sku: form.get("sku"), imageUrl: form.get("imageUrl") || undefined, categoryId: form.get("categoryId") || undefined, priceCents: Math.round(Number(form.get("price")) * 100), costCents: form.get("cost") ? Math.round(Number(form.get("cost")) * 100) : null, stock: Number(form.get("stock")), minStock: Number(form.get("minStock")) }) }, "Não foi possível cadastrar o produto.");
    setBusy(false); if (!result.ok) { setError(result.error); return; } element.reset(); router.refresh();
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><div className="block text-xs font-semibold">Nome do produto<Input name="name" required minLength={2} maxLength={120} className="mt-2" placeholder="Ex.: Kit de canecas" /></div><div className="block text-xs font-semibold">SKU<Input name="sku" maxLength={40} className="mt-2" placeholder="Opcional" /></div><div className="block text-xs font-semibold">Categoria<Select name="categoryId" className="mt-2"><option value="">Sem categoria</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</Select></div><div className="block text-xs font-semibold">Imagem (URL)<Input name="imageUrl" type="url" className="mt-2" placeholder="https://…" /></div><div className="block text-xs font-semibold">Preço de venda (R$)<Input name="price" type="number" step="0.01" min="0.01" required className="mt-2" /></div><div className="block text-xs font-semibold">Custo de aquisição (R$)<Input name="cost" type="number" step="0.01" min="0" className="mt-2" /></div><div className="block text-xs font-semibold">Estoque inicial<Input name="stock" type="number" min="0" defaultValue="0" required className="mt-2" /></div><div className="block text-xs font-semibold">Estoque mínimo<Input name="minStock" type="number" min="0" defaultValue="0" required className="mt-2" /></div><div className="block text-xs font-semibold sm:col-span-2">Descrição<Textarea name="description" maxLength={1000} rows={2} className="mt-2" /></div>{error && <p role="alert" className="error sm:col-span-2">{error}</p>}<Button disabled={busy} className="justify-self-start">{busy ? "Salvando…" : "Cadastrar produto"}</Button></form>;
}
