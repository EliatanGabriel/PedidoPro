import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { money } from "@/lib/format";
import { hasPlanFeature } from "@/lib/plans";
import { AccessDenied, PlanRequired } from "@/components/access-denied";
import { ExpenseManager } from "@/components/expense-manager";

export default async function ExpensesPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "manage_expenses")) return <AccessDenied/>;
  if (!await hasPlanFeature(context.company.id, "expenses")) return <PlanRequired feature="Controle de despesas"/>;
  const expenses = await prisma.expense.findMany({ where: { companyId: context.company.id, voidedAt: null }, orderBy: { occurredAt: "desc" }, take: 500 });
  const total = expenses.reduce((sum, expense) => sum + expense.amountCents, 0);
  return <div className="content"><p className="eyebrow">Financeiro</p><h1 className="page-title">Despesas</h1><p className="page-subtitle">Registre os gastos da empresa para acompanhar o resultado estimado.</p><article className="card stat-card mt-6 max-w-sm"><p className="stat-label">Despesas registradas</p><p className="stat-value">{money(total)}</p><p className="mt-2 text-[10px] text-[#87928b]">Soma dos registros ativos, sem filtro de período.</p></article><div className="mt-5"><ExpenseManager initial={expenses.map((expense)=>({...expense,occurredAt:expense.occurredAt.toISOString()}))}/></div></div>;
}
