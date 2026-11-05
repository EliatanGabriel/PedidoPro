import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preços — Ordexa",
  description: "Planos da Ordexa: gestão de pedidos, estoque e clientes. Plano gratuito para começar, assinaturas pagas com checkout recorrente.",
  openGraph: { title: "Preços — Ordexa", type: "website", description: "Escolha o plano ideal para o seu negócio.", images: [{ url: "/android-chrome-512x512.png", width: 512, height: 512 }] },
};

const featureLabels: Record<string, string> = {
  dashboard_basic: "Dashboard básico", orders: "Gestão de pedidos", reports: "Relatórios comerciais",
  advanced_reports: "Relatórios avançados", expenses: "Controle de despesas", stock: "Controle de estoque", public_store: "Página pública personalizada",
};

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } });
  return <main className="min-h-screen bg-[#fafcfb] px-5 py-10"><div className="mx-auto max-w-5xl"><Logo className="mb-2" width={30} height={17}/><p className="mt-12 text-xs font-bold uppercase tracking-widest text-[#177a56]">Planos</p><h1 className="mt-2 text-4xl font-bold">Comece no seu ritmo</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#748078]">Preços e limites vêm da configuração atual da plataforma. Assinaturas pagas usam checkout recorrente Cakto, quando habilitado.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{plans.map((plan) => {const planFeatures=Array.isArray(plan.features)?plan.features.filter((feature):feature is string=>typeof feature==="string").map(feature=>featureLabels[feature]??feature):[];return <section key={plan.id} className="card p-6"><h2 className="font-semibold">{plan.name}</h2><p className="mt-4 text-2xl font-bold">{plan.priceCents===0?"R$ 0":`${money(plan.priceCents)}/mês`}</p><ul className="mt-5 space-y-3 text-sm text-[#748078]"><li>Até {plan.monthlyOrderLimit===0?"ilimitados":plan.monthlyOrderLimit} pedidos/mês</li><li>{plan.productLimit===0?"Produtos ilimitados":`Até ${plan.productLimit} produtos`}</li><li>{plan.userLimit===0?"Usuários ilimitados":`Até ${plan.userLimit} usuário${plan.userLimit===1?"":"s"}`}</li>{planFeatures.map((feature)=><li key={feature}>✓ {feature}</li>)}</ul><Link href="/cadastro" className="button secondary mt-7 inline-block">Começar</Link></section>})}</div>{!plans.length&&<p className="card mt-8 p-6 text-sm text-[#748078]">Os planos estão temporariamente indisponíveis.</p>}</div></main>;
}
