import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { brazilStartOfMonth } from "@/lib/format";
import { subscriptionIsActive } from "@/lib/plans";
import { SubscriptionCheckout } from "@/components/subscription-checkout";
import { caktoConfigured } from "@/lib/cakto";
import { AccessDenied } from "@/components/access-denied";

export default async function SubscriptionPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (context.membership.role !== "OWNER") return <AccessDenied />;
  const [subscription, orders, products, members, plans, invoices] = await Promise.all([
    prisma.subscription.findUnique({ where: { companyId: context.company.id }, include: { plan: true } }),
    prisma.order.count({ where: { companyId: context.company.id, createdAt: { gte: brazilStartOfMonth() } } }),
    prisma.product.count({ where: { companyId: context.company.id, isActive: true } }),
    prisma.companyMember.count({ where: { companyId: context.company.id } }),
    prisma.plan.findMany({ where: { isActive: true, priceCents: { gt: 0 } }, orderBy: { priceCents: "asc" }, select: { id: true, name: true, priceCents: true } }),
    prisma.subscriptionInvoice.findMany({ where: { subscription: { companyId: context.company.id } }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);
  const usage: [string, number, number][] = [["Pedidos neste mês", orders, subscription?.plan.monthlyOrderLimit ?? 0], ["Produtos ativos", products, subscription?.plan.productLimit ?? 0], ["Usuários", members, subscription?.plan.userLimit ?? 0]];
  const active = subscription ? subscriptionIsActive(subscription) : false;
  return <div className="content"><p className="eyebrow">Plano e utilização</p><h1 className="page-title">Assinatura</h1><p className="page-subtitle">Acompanhe limites e situação da assinatura da empresa.</p>{subscription ? <section className="card mt-6 max-w-2xl p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-[#748078]">Plano atual</p><h2 className="mt-1 text-2xl font-bold">{subscription.plan.name}</h2></div><span className="badge">{active ? subscription.status : "INATIVA"}</span></div><div className="mt-6 space-y-5">{usage.map(([label, used, limit]) => <div key={label}><div className="flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{used} / {limit === 0 ? "Ilimitado" : limit}</span></div>{limit > 0 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee]"><div className="h-full rounded-full bg-[#4e9b72]" style={{ width: `${Math.min(100, used / limit * 100)}%` }}/></div>}</div>)}</div>{subscription.trialEndsAt && <p className="mt-5 text-xs text-[#748078]">Avaliação termina em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(subscription.trialEndsAt)}.</p>}{subscription.currentPeriodEndsAt && <p className="mt-2 text-xs text-[#748078]">Próxima renovação: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(subscription.currentPeriodEndsAt)}.</p>}{subscription.provider === "CAKTO" && <p className="mt-2 text-xs text-[#748078]">Assinatura vinculada à Cakto. Cobranças são atualizadas por webhook.</p>}<SubscriptionCheckout plans={plans.filter((plan) => plan.id !== subscription.planId)} configured={caktoConfigured} canCancel={Boolean(subscription.providerSubscriptionId && subscription.provider === "CAKTO" && subscription.status !== "CANCELED")}/>{invoices.length > 0 && <div className="mt-7 border-t border-[#e9eeea] pt-5"><h3 className="font-semibold">Histórico de cobranças</h3><div className="mt-3 divide-y divide-[#edf1ee]">{invoices.map((invoice) => <div key={invoice.id} className="flex justify-between gap-3 py-3 text-xs"><span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(invoice.paidAt ?? invoice.createdAt)} · {invoice.status}</span><span className="font-semibold">R$ {(invoice.amountCents / 100).toFixed(2).replace(".", ",")}</span></div>)}</div></div>}<Link href="/precos" className="button secondary mt-5 inline-block">Ver detalhes dos planos</Link></section> : <div className="card mt-6 max-w-2xl p-6 text-sm">Nenhuma assinatura está vinculada a esta empresa. Solicite suporte.</div>}</div>;
}
