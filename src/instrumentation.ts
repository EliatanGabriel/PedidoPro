import { logger } from "@/lib/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { validateEnv } = await import("@/lib/env");
  const { warnings } = validateEnv();
  for (const warning of warnings) logger.warn("env.configuration", { key: warning.key, detail: warning.message });
  logger.info("app.started", { environment: process.env.NODE_ENV ?? "unknown" });
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  logger.error("request.unhandled_error", error, {
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  });
}
