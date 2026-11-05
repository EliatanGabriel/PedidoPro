import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { hasPlanFeature } from "@/lib/plans";

const categories = ["RENT", "SUPPLIERS", "MARKETING", "SERVICES", "TAXES", "TRANSPORT", "OTHER"] as const;
const schema = z.object({ description: z.string().trim().min(3).max(160), category: z.enum(categories), amountCents: z.number().int().positive().max(2_147_483_647), occurredAt: z.iso.datetime(), notes: z.string().trim().max(500).optional().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_expenses")) return Response.json({ error: "Sem permissão para alterar despesas." }, { status: 403 });
  if (!await hasPlanFeature(context.company.id, "expenses")) return Response.json({ error: "O controle de despesas não está incluído no plano atual." }, { status: 402 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados da despesa." }, { status: 400 });
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.expense.updateMany({ where: { id, companyId: context.company.id, voidedAt: null }, data: { ...parsed.data, occurredAt: new Date(parsed.data.occurredAt) } });
      if (!result.count) throw new Error("EXPENSE_NOT_FOUND");
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "expense.updated", entity: "Expense", entityId: id, metadata: { amountCents: parsed.data.amountCents, category: parsed.data.category } } });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "EXPENSE_NOT_FOUND") return Response.json({ error: "Despesa não encontrada ou já estornada." }, { status: 404 });
    return Response.json({ error: "Não foi possível atualizar a despesa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_expenses")) return Response.json({ error: "Sem permissão para estornar despesas." }, { status: 403 });
  if (!await hasPlanFeature(context.company.id, "expenses")) return Response.json({ error: "O controle de despesas não está incluído no plano atual." }, { status: 402 });
  const { id } = await params;
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.expense.updateMany({ where: { id, companyId: context.company.id, voidedAt: null }, data: { voidedAt: new Date() } });
      if (!result.count) throw new Error("EXPENSE_NOT_FOUND");
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "expense.voided", entity: "Expense", entityId: id } });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "EXPENSE_NOT_FOUND") return Response.json({ error: "Despesa não encontrada ou já estornada." }, { status: 404 });
    return Response.json({ error: "Não foi possível estornar a despesa." }, { status: 500 });
  }
}
