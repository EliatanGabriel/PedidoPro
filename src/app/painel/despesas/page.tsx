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
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where: { companyId: context.company.id, voidedAt: null }, orderBy: { occurredAt: "desc" }, take: 500 }),
    prisma.expense.aggregate({ where: { companyId: context.company.id, voidedAt: null }, _sum: { amountCents: true } }),
  ]);
  return <div className="content"><p className="eyebrow">Financeiro</p><h1 className="page-title">Despesas</h1><p className="page-subtitle">Registre os gastos da empresa para acompanhar o resultado estimado.</p><div className="grid gap-4 md:grid-cols-3 mt-6"><article className="card stat-card"><p className="stat-label">Total registrado</p><p className="stat-value">{money(total._sum.amountCents ?? 0)}</p><p className="mt-2 text-[10px] text-[#87928b]">Soma de todas as despesas ativas</p></article><article className="card stat-card"><p className="stat-label">Registros</p><p className="stat-value">{expenses.length}</p><p className="mt-2 text-[10px] text-[#87928b]">Despesas não estornadas</p></article><article className="card stat-card"><p className="stat-label">Média por despesa</p><p className="stat-value">{expenses.length ? money(Math.round(total._sum.amountCents ?? 0 / expenses.length)) : "R$ 0,00"}</p><p className="mt-2 text-[10px] text-[#87928b]">Ticket médio dos lançamentos</p></article></div><div className="mt-5"><ExpenseManager initial={expenses.map((expense)=>({...expense,occurredAt:expense.occurredAt.toISOString(),notes:expense.notes??undefined}))}/></div></div>;
}
