import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

const schema = z.object({
  customerId: z.string().cuid(),
  type: z.enum(["ACCESS", "CORRECTION", "ANONYMIZATION", "OTHER"]),
  requestNote: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode consultar solicitações de privacidade." }, { status: 403 });
  const requests = await prisma.privacyRequest.findMany({
    where: { companyId: context.company.id },
    include: { customer: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, processedBy: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return Response.json({ requests });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode registrar solicitações de privacidade." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Selecione o cliente e revise o tipo e as observações." }, { status: 400 });
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: context.company.id, NOT: { name: { startsWith: "Cliente anonimizado " } } }, select: { id: true } });
  if (!customer) return Response.json({ error: "Cliente não encontrado nesta empresa." }, { status: 404 });

  const requestRecord = await prisma.$transaction(async (tx) => {
    const created = await tx.privacyRequest.create({ data: { ...parsed.data, companyId: context.company.id, createdById: context.user.id } });
    await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "privacy.request_created", entity: "PrivacyRequest", entityId: created.id, metadata: { customerId: customer.id, type: created.type } } });
    return created;
  });
  return Response.json({ request: requestRecord }, { status: 201 });
}
