import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(40) });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Faça login para continuar." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Confira o nome e o endereço da loja." }, { status: 400 });
  const existing = await prisma.companyMember.findFirst({ where: { userId: session.user.id } });
  if (existing) return Response.json({ error: "Sua conta já está vinculada a uma empresa." }, { status: 409 });
  try {
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({ data: parsed.data });
      const planDefinitions = [
        { code: "free", name: "Gratuito", priceCents: 0, monthlyOrderLimit: 30, productLimit: 20, userLimit: 1, features: ["dashboard_basic", "orders"] },
        { code: "professional", name: "Profissional", priceCents: 2990, monthlyOrderLimit: 300, productLimit: 200, userLimit: 3, features: ["reports", "expenses", "stock", "public_store"] },
        { code: "business", name: "Empresarial", priceCents: 5990, monthlyOrderLimit: 0, productLimit: 0, userLimit: 10, features: ["reports", "advanced_reports", "expenses", "stock", "public_store"] },
      ];
      const plans = await Promise.all(planDefinitions.map((definition) => tx.plan.upsert({ where: { code: definition.code }, update: {}, create: definition })));
      const plan = plans.find((item) => item.code === "free")!;
      await tx.companyMember.create({ data: { companyId: created.id, userId: session.user.id, role: "OWNER" } });
      await tx.subscription.create({ data: { companyId: created.id, planId: plan.id, status: "ACTIVE" } });
      await tx.auditLog.create({ data: { companyId: created.id, userId: session.user.id, action: "company.created", entity: "Company", entityId: created.id } });
      return created;
    });
    return Response.json({ company: { id: company.id, name: company.name, slug: company.slug } }, { status: 201 });
  } catch {
    return Response.json({ error: "Este endereço já está em uso. Escolha outro." }, { status: 409 });
  }
}
