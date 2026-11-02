"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerOption = { id: string; name: string };
type PrivacyRequest = {
  id: string;
  type: "ACCESS" | "CORRECTION" | "ANONYMIZATION" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "DECLINED";
  requestNote: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  processedAt: Date | null;
      customer: CustomerOption | null;
  createdBy: { name: string } | null;
  processedBy: { name: string } | null;
};

const typeLabels: Record<PrivacyRequest["type"], string> = { ACCESS: "Acesso / cópia", CORRECTION: "Correção", ANONYMIZATION: "Anonimização", OTHER: "Outra solicitação" };
const statusLabels: Record<PrivacyRequest["status"], string> = { OPEN: "Aberta", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", DECLINED: "Não atendida" };

export function PrivacyRequestManager({ initial, customers }: { initial: PrivacyRequest[]; customers: CustomerOption[] }) {
  const requests = initial;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("new"); setError("");
    try {
      const response = await fetch("/api/privacy-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: form.get("customerId"), type: form.get("type"), requestNote: form.get("requestNote") || undefined }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível registrar a solicitação.");
      formElement.reset(); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível registrar a solicitação."); }
    finally { setBusy(null); }
  }

  async function update(id: string, status: "IN_PROGRESS" | "COMPLETED" | "DECLINED", resolutionNote: string) {
    setBusy(id); setError("");
    try {
      const response = await fetch(`/api/privacy-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolutionNote }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível atualizar a solicitação.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a solicitação."); }
    finally { setBusy(null); }
  }

  async function completeAnonymization(request: PrivacyRequest) {
    if (!request.customer) { setError("O cadastro do cliente não está disponível para anonimização."); return; }
    if (!window.confirm(`Anonimizar os dados de ${request.customer.name} e concluir esta solicitação? Dados pessoais e referências em texto livre associados ao histórico serão removidos; valores e estados financeiros serão preservados.`)) return;
    setBusy(request.id); setError("");
    try {
      const anonymizeResponse = await fetch(`/api/customers/${request.customer.id}/anonymize`, { method: "POST" });
      const anonymizeBody = await anonymizeResponse.json() as { error?: string };
      if (!anonymizeResponse.ok) throw new Error(anonymizeBody.error ?? "Não foi possível anonimizar os dados.");
      const response = await fetch(`/api/privacy-requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED", resolutionNote: "Dados pessoais do cadastro e do histórico de pedidos anonimizados no PedidoPro." }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Dados anonimizados, mas não foi possível concluir o registro da solicitação.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível processar a solicitação."); }
    finally { setBusy(null); }
  }

  function promptResolution(request: PrivacyRequest, status: "COMPLETED" | "DECLINED") {
    const resolutionNote = window.prompt(status === "COMPLETED" ? "Descreva como a solicitação foi atendida:" : "Informe o motivo para não atender à solicitação:");
    if (!resolutionNote?.trim()) return;
    void update(request.id, status, resolutionNote.trim());
  }

  return <div className="space-y-6">
    <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Cliente relacionado<select name="customerId" required className="input mt-2"><option value="">Selecione um cadastro</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label className="text-xs font-semibold">Tipo de solicitação<select name="type" className="input mt-2"><option value="ACCESS">Acesso / cópia dos dados</option><option value="CORRECTION">Correção de dados</option><option value="ANONYMIZATION">Anonimização</option><option value="OTHER">Outra solicitação</option></select></label>
      <label className="text-xs font-semibold sm:col-span-2">Observação operacional<textarea name="requestNote" maxLength={1000} rows={2} className="input mt-2" placeholder="Registre o contexto mínimo necessário. Não inclua documentos nem dados sensíveis."/></label>
      {error && <p role="alert" className="error sm:col-span-2">{error}</p>}
      <button className="button w-fit" disabled={busy !== null || customers.length === 0}>{busy === "new" ? "Registrando…" : "Registrar solicitação"}</button>
      {customers.length === 0 && <p className="self-center text-xs text-[#748078]">Cadastre o cliente antes de abrir uma solicitação vinculada.</p>}
    </form>
    <section className="border-t border-[#e9eeea] pt-5">
      <h2 className="section-title">Solicitações registradas</h2>
      {requests.length === 0 ? <div className="empty mt-4">Nenhuma solicitação registrada.</div> : <div className="mt-3 divide-y divide-[#edf1ee]">{requests.map((request) => <article key={request.id} className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{typeLabels[request.type]} · {request.customer?.name ?? "Cadastro removido"}</h3><p className="mt-1 text-xs text-[#748078]">Recebida em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(request.createdAt)} por {request.createdBy?.name ?? "usuário removido"}</p>{request.requestNote && <p className="mt-2 text-xs text-[#59675f]">{request.requestNote}</p>}{request.resolutionNote && <p className="mt-2 text-xs text-[#59675f]">Resolução: {request.resolutionNote}</p>}{request.processedAt && <p className="mt-1 text-[10px] text-[#87928b]">Atualizada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(request.processedAt)}{request.processedBy ? ` por ${request.processedBy.name}` : ""}</p>}</div><span className="badge">{statusLabels[request.status]}</span></div>
        {request.status !== "COMPLETED" && request.status !== "DECLINED" && <div className="mt-3 flex flex-wrap gap-2">{request.type === "ACCESS" && request.customer && <a className="button secondary" href={`/api/customers/${request.customer.id}/export`}>Exportar dados</a>}{request.status === "OPEN" && <button type="button" className="button secondary" disabled={busy !== null} onClick={() => void update(request.id, "IN_PROGRESS", "Atendimento iniciado pelo proprietário.")}>Iniciar atendimento</button>}{request.type === "ANONYMIZATION" ? <button type="button" className="button secondary" disabled={busy !== null || request.status !== "IN_PROGRESS"} onClick={() => void completeAnonymization(request)}>{busy === request.id ? "Processando…" : "Anonimizar e concluir"}</button> : request.status === "IN_PROGRESS" && <button type="button" className="button secondary" disabled={busy !== null} onClick={() => promptResolution(request, "COMPLETED")}>Marcar como concluída</button>}<button type="button" className="text-xs font-semibold text-red-700" disabled={busy !== null || request.status !== "IN_PROGRESS"} onClick={() => promptResolution(request, "DECLINED")}>Registrar como não atendida</button></div>}
      </article>)}</div>}
    </section>
  </div>;
}
