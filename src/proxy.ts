import { NextRequest, NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/request-origin";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || !mutationMethods.has(request.method)) return NextResponse.next();
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/cron/")) return NextResponse.next();

  const allowed = isTrustedMutationOrigin(request.headers.get("origin"), [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
  ]);
  if (!allowed) return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
