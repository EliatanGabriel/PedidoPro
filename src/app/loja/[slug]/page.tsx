import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicStore } from "@/components/public-store";
import { hasPlanFeature } from "@/lib/plans";

export default async function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await prisma.company.findUnique({ where: { slug, isActive: true }, select: {
    id: true, name: true, description: true, phone: true, email: true, logoUrl: true, businessHours: true,
    deliveryFeeCents: true, acceptsPickup: true, acceptsDelivery: true, publicPaymentMethods: true, allowNegativeStock: true,
  } });
  if (!company || !await hasPlanFeature(company.id, "public_store")) notFound();
  const products = await prisma.product.findMany({
    where: { companyId: company.id, isActive: true, ...(company.allowNegativeStock ? {} : { stock: { gt: 0 } }) },
    select: { id: true, name: true, description: true, priceCents: true, stock: true, imageUrl: true, category: { select: { name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
  const publicPaymentMethods = Array.isArray(company.publicPaymentMethods) ? company.publicPaymentMethods.filter((method): method is string => typeof method === "string") : [];
  if (publicPaymentMethods.length === 0 || (!company.acceptsDelivery && !company.acceptsPickup)) notFound();
  return <PublicStore slug={slug} company={{ name: company.name, description: company.description, phone: company.phone, email: company.email, logoUrl: company.logoUrl, businessHours: company.businessHours, deliveryFeeCents: company.deliveryFeeCents, acceptsPickup: company.acceptsPickup, acceptsDelivery: company.acceptsDelivery, publicPaymentMethods, allowNegativeStock: company.allowNegativeStock }} products={products}/>;
}
