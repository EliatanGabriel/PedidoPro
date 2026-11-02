import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { canTransitionPrivacyRequest, customerIsAnonymized, type PrivacyRequestStatus } from "@/lib/privacy-request-rules";

const schema = z.object({ status: z.enum(["IN_PROGRESS", "COMPLETED", "DECLINED"]), resolutionNote: z.string().trim().min(3).max(1000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode atualizar solicitações de privacidade." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Informe uma ação e uma anotação de resolução válida." }, { status: 400 });
  const { id } = await params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.privacyRequest.findFirst({ where: { id, companyId: context.company.id }, include: { customer: { select: { id: true, name: true, phone: true, email: true, taxId: true, address: true, city: true, state: true, postalCode: true, notes: true } } } });
      if (!current) throw new Error("REQUEST_NOT_FOUND");
      if (!canTransitionPrivacyRequest(current.status as PrivacyRequestStatus, parsed.data.status)) throw new Error("INVALID_TRANSITION");
      if (parsed.data.status === "COMPLETED" && current.type === "ANONYMIZATION") {
        if (!current.customer || !customerIsAnonymized(current.customer)) throw new Error("ANONYMIZATION_NOT_DONE");
      }
      const record = await tx.privacyRequest.update({ where: { id: current.id }, data: {
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote,
        processedById: parsed.data.status === "COMPLETED" || parsed.data.status === "DECLINED" ? context.user.id : null,
        processedAt: parsed.data.status === "COMPLETED" || parsed.data.status === "DECLINED" ? new Date() : null,
      } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "privacy.request_updated", entity: "PrivacyRequest", entityId: current.id, metadata: { from: current.status, to: record.status, type: current.type } } });
      return record;
    });
    return Response.json({ request: updated });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      REQUEST_NOT_FOUND: "Solicitação não encontrada.",
      INVALID_TRANSITION: "A solicitação já foi encerrada ou esta transição não é permitida.",
      ANONYMIZATION_NOT_DONE: "Anonimize os dados do cliente antes de concluir esta solicitação.",
    };
    return Response.json({ error: messages[reason] ?? "Não foi possível atualizar a solicitação." }, { status: reason === "REQUEST_NOT_FOUND" ? 404 : reason ? 409 : 400 });
  }
}
