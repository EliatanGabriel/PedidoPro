import { getTenantContext } from "@/lib/tenant";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { AccessDenied } from "@/components/access-denied";

export default async function SettingsPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (context.membership.role !== "OWNER") return <AccessDenied/>;
  return <div className="content"><p className="eyebrow">Sua empresa</p><h1 className="page-title">Configurações</h1><p className="page-subtitle">Dados comerciais, estoque e opções da sua loja pública.</p><section className="card mt-6 max-w-3xl p-5"><CompanySettingsForm initial={{name:context.company.name,slug:context.company.slug,description:context.company.description,phone:context.company.phone,email:context.company.email,logoUrl:context.company.logoUrl,businessHours:context.company.businessHours,deliveryFeeCents:context.company.deliveryFeeCents,acceptsPickup:context.company.acceptsPickup,acceptsDelivery:context.company.acceptsDelivery,publicPaymentMethods:Array.isArray(context.company.publicPaymentMethods)?context.company.publicPaymentMethods.filter((method):method is string=>typeof method==="string"):[],allowNegativeStock:context.company.allowNegativeStock}}/></section></div>;
}
