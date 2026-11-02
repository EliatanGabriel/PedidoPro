const resendKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

export const authEmailConfigured = Boolean(resendKey && emailFrom);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function trustedActionUrl(value: string) {
  const actionUrl = new URL(value, process.env.BETTER_AUTH_URL);
  const trustedOrigins = [process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => new URL(origin).origin);
  if (!trustedOrigins.includes(actionUrl.origin) || !["http:", "https:"].includes(actionUrl.protocol)) {
    throw new Error("URL de ação de autenticação fora das origens confiáveis.");
  }
  return actionUrl.toString();
}

export async function sendAuthEmail({ to, subject, intro, actionLabel, actionUrl }: {
  to: string; subject: string; intro: string; actionLabel: string; actionUrl: string;
}) {
  if (!resendKey || !emailFrom) throw new Error("Configure RESEND_API_KEY e EMAIL_FROM para habilitar e-mails de autenticação.");
  const safeUrl = trustedActionUrl(actionUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: emailFrom,
      to: [to],
      subject,
      text: `${intro}\n\n${actionLabel}: ${safeUrl}\n\nSe você não solicitou esta ação, ignore esta mensagem.`,
      html: `<p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(safeUrl)}">${escapeHtml(actionLabel)}</a></p><p>Se você não solicitou esta ação, ignore esta mensagem.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Provedor de e-mail recusou a solicitação (HTTP ${response.status}).`);
}
