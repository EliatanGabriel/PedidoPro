import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authEmailConfigured, sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

type Db = Prisma.TransactionClient;

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  companyId?: string | null;
};

const MAX_ATTEMPTS = 5;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function enqueueEmail(db: Db, payload: EmailPayload) {
  if (!payload.to.trim()) return;
  await db.emailOutbox.create({
    data: {
      companyId: payload.companyId ?? null,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    },
  });
}

export async function processEmailOutbox(limit = 25) {
  if (!authEmailConfigured) return { processed: 0, sent: 0, failed: 0, skipped: "email_not_configured" };

  const pending = await prisma.emailOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await sendEmail({ to: item.to, subject: item.subject, text: item.text, html: item.html });
      await prisma.emailOutbox.update({ where: { id: item.id }, data: { status: "SENT", lastError: null } });
      sent += 1;
    } catch (error) {
      const attempts = item.attempts + 1;
      const terminal = attempts >= MAX_ATTEMPTS;
      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: {
          attempts,
          status: terminal ? "FAILED" : "PENDING",
          lastError: (error instanceof Error ? error.message : "Erro desconhecido").slice(0, 500),
          nextAttemptAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 60 * 60_000)),
        },
      });
      logger.error("email.outbox_delivery_failed", error, { id: item.id, attempts, terminal });
      failed += 1;
    }
  }

  if (Math.random() < 0.05) {
    await prisma.emailOutbox.deleteMany({ where: { status: { in: ["SENT", "FAILED"] }, updatedAt: { lt: new Date(Date.now() - RETENTION_MS) } } });
  }

  return { processed: pending.length, sent, failed };
}
