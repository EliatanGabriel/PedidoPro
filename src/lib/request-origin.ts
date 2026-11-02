export function isTrustedMutationOrigin(origin: string | null, configuredOrigins: Array<string | undefined>) {
  if (!origin) return false;
  let parsedOrigin: string;
  try { parsedOrigin = new URL(origin).origin; } catch { return false; }
  return configuredOrigins.some((configured) => {
    if (!configured) return false;
    try { return new URL(configured).origin === parsedOrigin; } catch { return false; }
  });
}
