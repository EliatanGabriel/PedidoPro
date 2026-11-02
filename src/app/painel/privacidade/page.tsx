import { AccessDenied } from "@/components/access-denied";
import { PrivacyRequestManager } from "@/components/privacy-request-manager";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export default async function PrivacyRequestsPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (context.membership.role !== "OWNER") return <AccessDenied/>;
  const [requests, customers] = await Promise.all([
    prisma.privacyRequest.findMany({ where: { companyId: context.company.id }, include: { customer: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, processedBy: { select: { name: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 }),
    prisma.customer.findMany({ where: { companyId: context.company.id, NOT: { name: { startsWith: "Cliente anonimizado " } } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  return <div className="content"><p className="eyebrow">Privacidade e dados</p><h1 className="page-title">Solicitações de privacidade</h1><p className="page-subtitle">Registre e acompanhe pedidos de acesso, correção e anonimização recebidos pela empresa.</p><section className="card mt-6 max-w-4xl p-5"><PrivacyRequestManager initial={requests} customers={customers}/></section><p className="mt-4 max-w-4xl text-xs leading-5 text-[#748078]">Este registro ajuda a documentar o atendimento operacional. Ele não substitui a definição de prazos, bases legais, retenção e procedimentos jurídicos aplicáveis ao seu negócio.</p></div>;
}
