import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authEmailConfigured } from "@/lib/email";
import { mercadoPagoConfigured } from "@/lib/mercado-pago";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let database: { status: "ok" | "error"; latencyMs?: number } = { status: "error" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { status: "ok", latencyMs: Date.now() - startedAt };
  } catch {
    database = { status: "error" };
  }

  const healthy = database.status === "ok";
  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database,
        integrations: {
          email: authEmailConfigured ? "configured" : "disabled",
          billing: mercadoPagoConfigured ? "configured" : "disabled",
        },
      },
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
