import { prisma } from "@/lib/prisma";
import { AdminPlanManager } from "@/components/admin-plan-manager";
export default async function AdminPlansPage(){const plans=await prisma.plan.findMany({orderBy:{priceCents:"asc"}});return <div className="content"><p className="eyebrow">Configuração comercial</p><h1 className="page-title">Planos</h1><p className="page-subtitle">Altere valores, limites e recursos disponíveis para as empresas.</p><div className="mt-6"><AdminPlanManager plans={plans}/></div></div>}
