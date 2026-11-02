import { z } from "zod";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  planId: z.string().cuid(),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"]),
  trialEndsAt: z.iso.datetime().nullable(),
  currentPeriodEndsAt: z.iso.datetime().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: "Acesso restrito." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Confira o plano, o status e as datas informadas." }, { status: 400 });
  const { id } = await params;
  const [current, plan] = await Promise.all([
    prisma.subscription.findUnique({ where: { id }, select: { id: true, companyId: true, planId: true, status: true, trialEndsAt: true, currentPeriodEndsAt: true } }),
    prisma.plan.findUnique({ where: { id: parsed.data.planId }, select: { id: true, isActive: true } }),
  ]);
  if (!current) return Response.json({ error: "Assinatura não encontrada." }, { status: 404 });
  if (!plan || !plan.isActive) return Response.json({ error: "Selecione um plano ativo." }, { status: 400 });

  const subscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({ where: { id }, data: { planId: plan.id, status: parsed.data.status, trialEndsAt: parsed.data.trialEndsAt ? new Date(parsed.data.trialEndsAt) : null, currentPeriodEndsAt: parsed.data.currentPeriodEndsAt ? new Date(parsed.data.currentPeriodEndsAt) : null } });
    await tx.auditLog.create({ data: { userId: admin.id, companyId: current.companyId, action: "platform.subscription_updated", entity: "Subscription", entityId: id, metadata: { previous: { planId: current.planId, status: current.status }, current: { planId: updated.planId, status: updated.status } } } });
    return updated;
  });
  return Response.json({ subscription });
}
