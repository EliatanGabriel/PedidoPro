import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { hasPlanFeature } from "@/lib/plans";

const categories = ["RENT", "SUPPLIERS", "MARKETING", "SERVICES", "TAXES", "TRANSPORT", "OTHER"] as const;
const schema = z.object({ description: z.string().trim().min(3).max(160), category: z.enum(categories), amountCents: z.number().int().positive().max(2_147_483_647), occurredAt: z.iso.datetime(), notes: z.string().trim().max(500).optional().nullable() });

export async function GET() {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_expenses")) return Response.json({ error: "Sem permissão para consultar despesas." }, { status: 403 });
  if (!await hasPlanFeature(context.company.id, "expenses")) return Response.json({ error: "O controle de despesas não está incluído no plano atual." }, { status: 402 });
  const expenses = await prisma.expense.findMany({ where: { companyId: context.company.id, voidedAt: null }, orderBy: { occurredAt: "desc" }, take: 500 });
  return Response.json({ expenses });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_expenses")) return Response.json({ error: "Sem permissão para cadastrar despesas." }, { status: 403 });
  if (!await hasPlanFeature(context.company.id, "expenses")) return Response.json({ error: "O controle de despesas não está incluído no plano atual." }, { status: 402 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise a descrição, a categoria, o valor e a data." }, { status: 400 });
  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({ data: { ...parsed.data, occurredAt: new Date(parsed.data.occurredAt), companyId: context.company.id, createdById: context.user.id } });
    await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "expense.created", entity: "Expense", entityId: created.id, metadata: { amountCents: created.amountCents, category: created.category } } });
    return created;
  });
  return Response.json({ expense }, { status: 201 });
}
