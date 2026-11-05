import { getPlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: "Acesso restrito." }, { status: 403 });
  const { id } = await params;
  const email = await prisma.emailOutbox.findUnique({ where: { id }, select: { id: true, companyId: true, status: true, subject: true } });
  if (!email) return Response.json({ error: "E-mail não encontrado." }, { status: 404 });
  if (email.status === "SENT") return Response.json({ error: "Este e-mail já foi enviado." }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.emailOutbox.update({
      where: { id },
      data: { status: "PENDING", attempts: 0, lastError: null, nextAttemptAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        companyId: email.companyId,
        userId: admin.id,
        action: "platform.email_requeued",
        entity: "EmailOutbox",
        entityId: id,
        metadata: { subject: email.subject, previousStatus: email.status },
      },
    });
  });

  return Response.json({ ok: true });
}
