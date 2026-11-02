import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function allowPublicOrder(request: Request, slug: string) {
  const forwarded = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const fingerprint = createHash("sha256").update(forwarded).digest("hex");
  const key = `public-order:${slug}:${fingerprint}`;
  const now = BigInt(Date.now());
  const cutoff = now - BigInt(60_000);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."lastRequest" <= ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "lastRequest" = CASE WHEN "RateLimit"."lastRequest" <= ${cutoff} THEN ${now} ELSE "RateLimit"."lastRequest" END
    RETURNING "count"
  `;
  if (Math.random() < 0.01) {
    await prisma.rateLimit.deleteMany({ where: { lastRequest: { lt: now - BigInt(86_400_000) } } });
  }
  return (rows[0]?.count ?? 0) <= 5;
}
