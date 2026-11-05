export type EnvIssue = {
  key: string;
  severity: "error" | "warning";
  message: string;
};

type Env = Record<string, string | undefined>;

function validUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function inspectEnv(env: Env = process.env): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const production = env.NODE_ENV === "production";

  if (!env.DATABASE_URL) {
    issues.push({ key: "DATABASE_URL", severity: "error", message: "Configure a conexão com o PostgreSQL." });
  }

  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    issues.push({
      key: "BETTER_AUTH_SECRET",
      severity: production ? "error" : "warning",
      message: "Defina um segredo aleatório com pelo menos 32 caracteres.",
    });
  }

  const authUrl = validUrl(env.BETTER_AUTH_URL);
  const appUrl = validUrl(env.NEXT_PUBLIC_APP_URL);
  if (!authUrl) {
    issues.push({
      key: "BETTER_AUTH_URL",
      severity: production ? "error" : "warning",
      message: "Informe uma URL absoluta, por exemplo https://app.seudominio.com.",
    });
  }
  if (!appUrl) {
    issues.push({
      key: "NEXT_PUBLIC_APP_URL",
      severity: production ? "error" : "warning",
      message: "Informe uma URL absoluta, por exemplo https://app.seudominio.com.",
    });
  }
  if (authUrl && appUrl && authUrl.origin !== appUrl.origin) {
    issues.push({
      key: "BETTER_AUTH_URL",
      severity: "warning",
      message: "BETTER_AUTH_URL e NEXT_PUBLIC_APP_URL devem apontar para a mesma origem.",
    });
  }
  if (production && appUrl?.protocol !== "https:") {
    issues.push({
      key: "NEXT_PUBLIC_APP_URL",
      severity: "warning",
      message: "Use HTTPS em produção para cookies seguros e HSTS.",
    });
  }

  const hasResendKey = Boolean(env.RESEND_API_KEY);
  const hasEmailFrom = Boolean(env.EMAIL_FROM);
  if (hasResendKey !== hasEmailFrom) {
    issues.push({
      key: "RESEND_API_KEY",
      severity: "warning",
      message: "Configure RESEND_API_KEY e EMAIL_FROM juntos para habilitar verificação e recuperação de senha.",
    });
  } else if (!hasResendKey) {
    issues.push({
      key: "RESEND_API_KEY",
      severity: "warning",
      message: "Sem e-mail configurado, verificação e recuperação de senha ficam desativadas.",
    });
  }

  const hasMercadoPagoToken = Boolean(env.MERCADO_PAGO_ACCESS_TOKEN);
  const hasMercadoPagoSecret = Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET);
  if (hasMercadoPagoToken !== hasMercadoPagoSecret) {
    issues.push({
      key: "MERCADO_PAGO_ACCESS_TOKEN",
      severity: "warning",
      message: "Configure MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_WEBHOOK_SECRET juntos.",
    });
  }

  if (production && !env.CRON_SECRET) {
    issues.push({
      key: "CRON_SECRET",
      severity: "warning",
      message: "Sem CRON_SECRET, a fila de e-mails só será processada logo após cada evento.",
    });
  }

  if (production && env.TRUST_PROXY !== "true") {
    issues.push({
      key: "TRUST_PROXY",
      severity: "warning",
      message: "Defina TRUST_PROXY=true somente se estiver atrás de um proxy confiável que sobrescreve X-Forwarded-For.",
    });
  }

  return issues;
}

export function validateEnv(options: { strict?: boolean; env?: Env } = {}) {
  const env = options.env ?? process.env;
  const strict = options.strict ?? env.NODE_ENV === "production";
  const issues = inspectEnv(env);
  const errors = issues.filter((issue) => issue.severity === "error" && strict);
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (errors.length) {
    throw new Error(`Configuração de ambiente inválida: ${errors.map((issue) => `${issue.key} (${issue.message})`).join("; ")}`);
  }
  return { errors, warnings };
}
