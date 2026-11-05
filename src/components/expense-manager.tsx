"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { Button, Input, Select } from "@/components/ui";

type Expense = { id: string; description: string; category: string; amountCents: number; occurredAt: string };
const categories = [["RENT", "Aluguel"], ["SUPPLIERS", "Fornecedores"], ["MARKETING", "Marketing"], ["SERVICES", "Serviços"], ["TAXES", "Impostos"], ["TRANSPORT", "Transporte"], ["OTHER", "Outros"]];
const labels = Object.fromEntries(categories);
function localDate(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

export function ExpenseManager({ initial }: { initial: Expense[] }) {
  const [expenses, setExpenses] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy(true); setError("");
    const data = { description: form.get("description"), category: form.get("category"), amountCents: Math.round(Number(form.get("amount")) * 100), occurredAt: new Date(String(form.get("occurredAt"))).toISOString() };
    try {
      const response = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Não foi possível cadastrar a despesa."); return; }
      setExpenses((current) => [body.expense, ...current]); formElement.reset(); router.refresh();
    } catch { setError("Falha de conexão ao salvar a despesa."); } finally { setBusy(false); }
  }
  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    const data = { description: form.get("description"), category: form.get("category"), amountCents: Math.round(Number(form.get("amount")) * 100), occurredAt: new Date(String(form.get("occurredAt"))).toISOString() };
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Não foi possível alterar a despesa."); return; }
      setExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, description: String(data.description), category: String(data.category), amountCents: data.amountCents, occurredAt: data.occurredAt } : expense)); router.refresh();
    } catch { setError("Falha de conexão ao alterar a despesa."); } finally { setBusy(false); }
  }
  async function voidExpense(id: string) {
    if (!window.confirm("Estornar esta despesa? O registro será mantido na auditoria e deixará de compor os relatórios.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" }); const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Não foi possível estornar a despesa."); return; }
      setExpenses((current) => current.filter((expense) => expense.id !== id)); router.refresh();
    } catch { setError("Falha de conexão ao estornar a despesa."); } finally { setBusy(false); }
  }
  function fields(expense?: Expense) { return <><div className="block text-xs font-semibold">Descrição<Input name="description" defaultValue={expense?.description} required minLength={3} maxLength={160} className="mt-1"/></div><div className="block text-xs font-semibold">Categoria<Select name="category" defaultValue={expense?.category??"SUPPLIERS"} className="mt-1">{categories.map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></div><div className="block text-xs font-semibold">Valor (R$)<Input name="amount" type="number" min="0.01" step="0.01" defaultValue={expense?(expense.amountCents/100).toFixed(2):undefined} required className="mt-1"/></div><div className="block text-xs font-semibold">Data e hora<Input name="occurredAt" type="datetime-local" defaultValue={expense?localDate(expense.occurredAt):localDate(new Date().toISOString())} required className="mt-1"/></div></>; }
  return <div className="space-y-5"><form onSubmit={create} className="card grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">{fields()}<Button disabled={busy} className="self-end">{busy?"Salvando…":"Registrar despesa"}</Button></form>{error&&<p role="alert" className="error">{error}</p>}<section className="card overflow-hidden"><div className="overflow-x-auto"><table className="table"><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{expenses.map((expense)=><tr key={expense.id}><td>{new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(expense.occurredAt))}</td><td className="font-semibold">{expense.description}</td><td>{labels[expense.category]??expense.category}</td><td>{money(expense.amountCents)}</td><td><details className="relative"><summary className="cursor-pointer text-xs font-semibold text-[#177a56]">Editar</summary><form onSubmit={(event)=>update(event,expense.id)} className="absolute right-0 z-10 mt-2 grid w-[min(90vw,360px)] gap-3 rounded-xl border border-[#e3e9e4] bg-white p-4 text-left shadow-lg">{fields(expense)}<div className="flex justify-between"><button type="button" disabled={busy} onClick={()=>voidExpense(expense.id)} className="text-xs font-semibold text-red-700">Estornar</button><Button disabled={busy}>Salvar</Button></div></form></details></td></tr>)}</tbody></table></div>{!expenses.length&&<div className="empty">Nenhuma despesa neste período.</div>}</section></div>;
}
