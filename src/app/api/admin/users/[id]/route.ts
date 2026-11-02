import { z } from "zod";
import { getPlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

const schema = z.object({ platformRole: z.enum(["USER", "PLATFORM_ADMIN"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getPlatformAdmin();
  if (!admin) return Response.json({ error: "Acesso restrito." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Perfil de plataforma inválido." }, { status: 400 });
  const { id } = await params;
  const current = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, platformRole: true } });
  if (!current) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (current.id === admin.id && parsed.data.platformRole !== "PLATFORM_ADMIN") {
    return Response.json({ error: "Você não pode remover seu próprio acesso administrativo." }, { status: 400 });
  }
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: { platformRole: parsed.data.platformRole }, select: { id: true, email: true, platformRole: true } });
    await tx.auditLog.create({ data: { userId: admin.id, action: "platform.user_role_updated", entity: "User", entityId: id, metadata: { email: updated.email, previous: current.platformRole, current: updated.platformRole } } });
    return updated;
  });
  return Response.json({ user });
}
