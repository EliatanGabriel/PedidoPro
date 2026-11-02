import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { NewOrderForm } from "@/components/new-order-form";
import { AccessDenied } from "@/components/access-denied";

export default async function NewOrderPage() {
  const context = await getTenantContext(); if (!context) return null;
  if (!can(context, "create_orders")) return <AccessDenied />;
  const [products, customers] = await Promise.all([
    prisma.product.findMany({ where: { companyId: context.company.id, isActive: true, stock: { gt: 0 } }, select: { id: true, name: true, priceCents: true, stock: true }, orderBy: { name: "asc" } }),
    can(context, "manage_customers") ? prisma.customer.findMany({ where: { companyId: context.company.id }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" }, take: 500 }) : Promise.resolve([]),
  ]);
  return <div className="content"><p className="eyebrow">Vendas</p><h1 className="page-title">Novo pedido</h1><p className="page-subtitle">Os preços e totais serão conferidos novamente no servidor.</p><div className="mt-6"><NewOrderForm products={products} customers={customers} allowCustomerSelection={can(context, "manage_customers")} canViewOrders={can(context, "view_orders")}/></div></div>;
}
