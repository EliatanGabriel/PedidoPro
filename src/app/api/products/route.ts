import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { subscriptionIsActive } from "@/lib/plans";

const productSchema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().max(1000).optional(), sku: z.string().trim().max(40).optional(), imageUrl: z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "URL deve usar HTTP ou HTTPS").optional().or(z.literal("")), categoryId: z.string().cuid().optional(), priceCents: z.number().int().positive().max(2_147_483_647), costCents: z.number().int().nonnegative().max(2_147_483_647).nullable().optional(), stock: z.number().int().nonnegative().max(2_147_483_647).default(0), minStock: z.number().int().nonnegative().max(2_147_483_647).default(0) });

export async function GET() {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "view_products")) return Response.json({ error: "Sem permissão para consultar produtos." }, { status: 403 });
  const products = await prisma.product.findMany({ where: { companyId: context.company.id, isActive: true }, orderBy: { name: "asc" } });
  return Response.json({ products });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_products")) return Response.json({ error: "Sem permissão para cadastrar produtos." }, { status: 403 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados do produto." }, { status: 400 });
  if (parsed.data.categoryId && !await prisma.category.findFirst({ where: { id: parsed.data.categoryId, companyId: context.company.id } })) return Response.json({ error: "Categoria não encontrada nesta empresa." }, { status: 400 });
  const plan = await prisma.subscription.findUnique({ where: { companyId: context.company.id }, include: { plan: true } });
  if (plan && !subscriptionIsActive(plan)) return Response.json({ error: "A assinatura da empresa não está ativa." }, { status: 402 });
  const count = await prisma.product.count({ where: { companyId: context.company.id, isActive: true } });
  if (plan && plan.plan.productLimit > 0 && count >= plan.plan.productLimit) return Response.json({ error: "Limite de produtos do plano atingido." }, { status: 402 });
  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: { ...parsed.data, companyId: context.company.id, sku: parsed.data.sku || null, imageUrl: parsed.data.imageUrl || null, categoryId: parsed.data.categoryId || null } });
      if (created.stock > 0) await tx.stockMovement.create({ data: { companyId: context.company.id, productId: created.id, type: "ADJUSTMENT", quantity: created.stock, note: "Estoque inicial" } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "product.created", entity: "Product", entityId: created.id } });
      return created;
    });
    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Verifique se o SKU já está cadastrado." }, { status: 409 });
  }
}
