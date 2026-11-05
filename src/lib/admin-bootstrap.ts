import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type AdminCandidate = {
  id: string;
  email: string;
  platformRole: string;
};

function bootstrapEmails() {
  return (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function ensureBootstrapAdmin<T extends AdminCandidate>(user: T): Promise<T> {
  const emails = bootstrapEmails();
  if (!emails.length || user.platformRole === "PLATFORM_ADMIN") return user;
  if (!emails.includes(user.email.trim().toLowerCase())) return user;

  const promoted = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { platformRole: "PLATFORM_ADMIN" },
      select: { platformRole: true },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "platform.admin_bootstrapped",
        entity: "User",
        entityId: user.id,
        metadata: { source: "ADMIN_BOOTSTRAP_EMAIL" },
      },
    });
    return updated;
  });

  logger.info("platform.admin_bootstrapped", { userId: user.id });
  return { ...user, platformRole: promoted.platformRole };
}
