"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const permissionOptions = [
  ["view_orders", "Visualizar pedidos"],
  ["create_orders", "Criar pedidos"],
  ["edit_orders", "Editar pedidos"],
  ["update_order_status", "Atualizar status"],
  ["manage_discounts", "Conceder descontos"],
  ["manage_customers", "Cadastrar clientes"],
  ["view_products", "Consultar produtos"],
  ["manage_products", "Gerenciar produtos"],
  ["manage_stock", "Gerenciar estoque"],
  ["manage_deliveries", "Gerenciar entregas"],
  ["view_reports", "Visualizar relatórios"],
  ["manage_expenses", "Gerenciar despesas"],
  ["manage_payments", "Registrar pagamentos"],
] as const;

type Member = { id: string; user: { name: string; email: string }; role: string; permissions: unknown };

export function TeamManager({ initial }: { initial: Member[] }) {
  const [members, setMembers] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const permissions = permissionOptions.map(([key]) => key).filter((key) => form.get(`permission-${key}`) === "on");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/company/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), role: "EMPLOYEE", permissions }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar o acesso.");
      const current = members.findIndex((member) => member.id === body.member.id);
      setMembers(current < 0 ? [...members, body.member] : members.map((member, index) => index === current ? body.member : member));
      element.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remover o acesso desta pessoa à empresa?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/company/members/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Não foi possível remover o acesso.");
      setMembers((current) => current.filter((member) => member.id !== id));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível remover o acesso.");
    } finally {
      setBusy(false);
    }
  }

  const hasLegacyManagers = members.some((member) => member.role === "MANAGER");

  return <div className="space-y-5">
    <form onSubmit={add} className="space-y-4">
      <label className="block text-xs font-semibold">E-mail da conta PedidoPro
        <input name="email" type="email" required className="input mt-2" placeholder="pessoa@empresa.com" />
      </label>
      <fieldset>
        <legend className="text-xs font-semibold">Permissões de funcionário</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {permissionOptions.map(([key, label]) => <label key={key} className="flex items-center gap-2 text-xs text-[#59675f]">
            <input type="checkbox" name={`permission-${key}`} />{label}
          </label>)}
        </div>
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <button disabled={busy} className="button">{busy ? "Salvando…" : "Adicionar ou atualizar acesso"}</button>
      <p className="text-[10px] text-[#87928b]">A pessoa precisa ter uma conta PedidoPro. O sistema não envia convite por e-mail nesta versão.</p>
    </form>

    <div className="border-t border-[#edf0ed] pt-4">
      <h3 className="text-sm font-semibold">Pessoas com acesso</h3>
      {hasLegacyManagers && <p className="mt-2 text-xs text-amber-800">A conta com perfil antigo de gerente está sem permissões implícitas. Informe o e-mail acima e selecione as permissões para reconfigurá-la como funcionário.</p>}
      <div className="mt-3 divide-y divide-[#edf0ed]">
        {members.map((member) => <div key={member.id} className="flex items-center justify-between gap-4 py-3">
          <div>
            <p className="text-sm font-semibold">{member.user.name}</p>
            <p className="text-xs text-[#748078]">{member.user.email} · {member.role === "OWNER" ? "Proprietário" : member.role === "MANAGER" ? "Gerente antigo" : "Funcionário"}</p>
          </div>
          {member.role !== "OWNER" && <button type="button" disabled={busy} onClick={() => void remove(member.id)} className="text-xs font-semibold text-red-700">Remover</button>}
        </div>)}
      </div>
    </div>
  </div>;
}
