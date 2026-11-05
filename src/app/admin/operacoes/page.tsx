import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateTime } from "@/lib/format";
import { authEmailConfigured } from "@/lib/email";
import { caktoConfigured } from "@/lib/cakto";
import { AdminEmailRetry } from "@/components/admin-email-retry";

export const dynamic = "force-dynamic";

const emailStatusLabels: Record<string, string> = { PENDING: "Pendente", SENT: "Enviado", FAILED: "Falhou" };
const privacyStatusLabels: Record<string, string> = { OPEN: "Aberta", IN_PROGRESS: "Em andamento", COMPLETED: "Concluída", DECLINED: "Não atendida" };
const privacyTypeLabels: Record<string, string> = { ACCESS: "Acesso", CORRECTION: "Correção", ANONYMIZATION: "Anonimização", OTHER: "Outra" };

function countFor(rows: { status: string; _count: { _all: number } }[], status: string) {
  return rows.find((row) => row.status === status)?._count._all ?? 0;
}

async function checkDatabase() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - startedAt };
  } catch {
    return { ok: false, latency: 0 };
  }
}

export default async function AdminOperationsPage() {
  const database = await checkDatabase();

  const [emailCounts, emails, privacyCounts, privacyRequests, webhookEvents] = await Promise.all([
    prisma.emailOutbox.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailOutbox.findMany({
      where: { status: { in: ["PENDING", "FAILED"] } },
      select: { id: true, to: true, subject: true, status: true, attempts: true, lastError: true, updatedAt: true, company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.privacyRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.privacyRequest.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: { id: true, type: true, status: true, createdAt: true, company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
      take: 10,
    }),
    prisma.providerWebhookEvent.findMany({ select: { id: true, provider: true, eventType: true, processedAt: true }, orderBy: { processedAt: "desc" }, take: 10 }),
  ]);

  const emailCards: [string, number][] = [
    ["E-mails pendentes", countFor(emailCounts, "PENDING")],
    ["E-mails com falha", countFor(emailCounts, "FAILED")],
    ["E-mails enviados", countFor(emailCounts, "SENT")],
    ["Solicitações LGPD abertas", countFor(privacyCounts, "OPEN")],
  ];

  return <div className="content">
    <p className="eyebrow">Saúde da plataforma</p>
    <h1 className="page-title">Operações</h1>
    <p className="page-subtitle">Fila de e-mails, solicitações de privacidade, webhooks e diagnóstico dos serviços.</p>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {emailCards.map(([label, value]) => <article key={label} className="card stat-card"><p className="stat-label">{label}</p><p className="stat-value">{value}</p></article>)}
    </div>

    <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <div><h2 className="section-title">Fila de e-mails</h2><p className="mt-1 text-xs text-[#87928b]">Pendentes e com falha. O reenvio devolve o item para a fila.</p></div>
            <span className="badge">{emails.length} exibido{emails.length === 1 ? "" : "s"}</span>
          </div>
          {emails.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Destinatário</th><th className="hidden md:table-cell">Assunto</th><th className="hidden md:table-cell">Tentativas</th><th className="hidden md:table-cell">Atualizado</th><th>Status</th><th>Ação</th></tr></thead><tbody>{emails.map((email) => <tr key={email.id}><td className="font-semibold">{email.to}<span className="block text-[10px] font-normal text-[#87928b]">{email.company?.name ?? "Conta de acesso"}</span><span className="block text-[10px] font-normal text-[#87928b] md:hidden">{email.subject}</span>{email.lastError && <span className="mt-1 block max-w-64 truncate text-[10px] font-normal text-red-700" title={email.lastError}>{email.lastError}</span>}</td><td className="hidden md:table-cell">{email.subject}</td><td className="hidden md:table-cell">{email.attempts}</td><td className="hidden md:table-cell">{dateTime(email.updatedAt)}</td><td><span className="badge">{emailStatusLabels[email.status] ?? email.status}</span></td><td>{email.status === "FAILED" && <AdminEmailRetry id={email.id}/>}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhum e-mail pendente ou com falha.</div>}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="section-title">Solicitações de privacidade em aberto</h2><span className="badge">{privacyRequests.length}</span></div>
          {privacyRequests.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Empresa</th><th className="hidden md:table-cell">Tipo</th><th className="hidden md:table-cell">Aberta em</th><th>Status</th></tr></thead><tbody>{privacyRequests.map((request) => <tr key={request.id}><td className="font-semibold">{request.company.name}<span className="mt-1 block text-[10px] font-normal text-[#87928b] md:hidden">{privacyTypeLabels[request.type] ?? request.type}</span></td><td className="hidden md:table-cell">{privacyTypeLabels[request.type] ?? request.type}</td><td className="hidden md:table-cell">{dateTime(request.createdAt)}</td><td><span className="badge">{privacyStatusLabels[request.status] ?? request.status}</span></td></tr>)}</tbody></table></div> : <div className="empty">Nenhuma solicitação em aberto.</div>}
          <p className="border-t border-[#edf0ed] px-5 py-3 text-xs text-[#87928b]">O tratamento é feito pela empresa em <strong>/painel/privacidade</strong>.</p>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5"><h2 className="section-title">Webhooks recentes</h2><span className="text-xs text-[#87928b]">Últimos 10 eventos processados</span></div>
          {webhookEvents.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Provedor</th><th className="hidden md:table-cell">Evento</th><th>Processado em</th></tr></thead><tbody>{webhookEvents.map((event) => <tr key={event.id}><td className="font-semibold">{event.provider}</td><td className="hidden md:table-cell">{event.eventType}</td><td>{dateTime(event.processedAt)}</td></tr>)}</tbody></table></div> : <div className="empty">Nenhum webhook processado.</div>}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="section-title">Diagnóstico</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3"><span className="text-[#748078]">Banco de dados</span><span className={database.ok ? "font-semibold text-[#177a56]" : "font-semibold text-red-700"}>{database.ok ? `OK · ${database.latency} ms` : "Indisponível"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#748078]">E-mail transacional</span><span className={authEmailConfigured ? "font-semibold text-[#177a56]" : "font-semibold text-red-700"}>{authEmailConfigured ? "Configurado" : "Desativado"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#748078]">Cobrança Cakto</span><span className={caktoConfigured ? "font-semibold text-[#177a56]" : "font-semibold text-red-700"}>{caktoConfigured ? "Configurada" : "Desativada"}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#748078]">Solicitações LGPD abertas</span><span className="font-semibold">{countFor(privacyCounts, "OPEN")}</span></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[#748078]">Em andamento</span><span className="font-semibold">{countFor(privacyCounts, "IN_PROGRESS")}</span></div>
          </div>
          <div className="mt-4 grid gap-2">
            <Link className="button secondary" href="/admin/auditoria">Ver auditoria</Link>
            <Link className="button secondary" href="/api/healthcheck" target="_blank">Abrir healthcheck</Link>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="section-title">Como a fila funciona</h2>
          <p className="mt-3 text-xs leading-5 text-[#748078]">E-mails falham até 5 tentativas antes de ficarem como <strong>Falhou</strong>. O cron <code>/api/cron/email-outbox</code> reprocessa a fila; o botão <strong>Reenviar</strong> recoloca um item imediatamente na fila.</p>
        </section>
      </aside>
    </div>
  </div>;
}
