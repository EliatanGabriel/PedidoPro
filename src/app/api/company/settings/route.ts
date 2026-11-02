import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

const paymentMethods = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"] as const;
const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(40),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.email().optional().or(z.literal("")),
  logoUrl: z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), "URL deve usar HTTP ou HTTPS").optional().or(z.literal("")),
  businessHours: z.string().trim().max(500).optional(),
  deliveryFeeCents: z.number().int().nonnegative().max(2_147_483_647),
  acceptsPickup: z.boolean(),
  acceptsDelivery: z.boolean(),
  publicPaymentMethods: z.array(z.enum(paymentMethods)).min(1).max(paymentMethods.length),
  allowNegativeStock: z.boolean(),
}).refine((data) => data.acceptsPickup || data.acceptsDelivery, { message: "Habilite pelo menos uma modalidade de recebimento." });

export async function PATCH(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode alterar as configurações." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados comerciais, horários e opções da loja." }, { status: 400 });
  try {
    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id: context.company.id },
        data: { ...parsed.data, description: parsed.data.description || null, phone: parsed.data.phone || null, email: parsed.data.email || null, logoUrl: parsed.data.logoUrl || null, businessHours: parsed.data.businessHours || null },
      });
      await tx.auditLog.create({ data: { companyId: updated.id, userId: context.user.id, action: "company.settings_updated", entity: "Company", entityId: updated.id, metadata: { allowNegativeStock: updated.allowNegativeStock, deliveryFeeCents: updated.deliveryFeeCents, acceptsPickup: updated.acceptsPickup, acceptsDelivery: updated.acceptsDelivery, publicPaymentMethods: updated.publicPaymentMethods } } });
      return updated;
    });
    return Response.json({ company });
  } catch {
    return Response.json({ error: "Não foi possível salvar. Verifique se o endereço da loja está disponível." }, { status: 409 });
  }
}
