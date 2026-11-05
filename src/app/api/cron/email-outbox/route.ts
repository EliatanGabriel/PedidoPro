import { timingSafeEqual } from "node:crypto";
import { processEmailOutbox } from "@/lib/email-outbox";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function authorized(request: Request, secret: string) {
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron não configurado." }, { status: 503 });
  if (!authorized(request, secret)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const result = await processEmailOutbox(50);
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("email.outbox_cron_failed", error);
    return Response.json({ error: "Falha ao processar a fila de e-mails." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
