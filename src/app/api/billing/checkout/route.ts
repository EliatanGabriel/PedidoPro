import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { mercadoPagoConfigured, mercadoPagoRequest } from "@/lib/mercado-pago";
import { isMercadoPagoCheckoutUrl } from "@/lib/mercado-pago-url";

const inputSchema = z.object({ planId: z.string().min(1) });

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Faça login e configure sua empresa." }, { status: 401 });
  if (context.membership.role !== "OWNER") return Response.json({ error: "Somente o proprietário pode alterar o plano." }, { status: 403 });
  if (!context.company.isActive) return Response.json({ error: "Empresa bloqueada." }, { status: 403 });
  if (!mercadoPagoConfigured) return Response.json({ error: "Cobrança indisponível: configure as credenciais do Mercado Pago e o segredo de webhook." }, { status: 503 });

  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Plano inválido." }, { status: 400 });
  const [plan, subscription] = await Promise.all([
    prisma.plan.findFirst({ where: { id: parsed.data.planId, isActive: true } }),
    prisma.subscription.findUnique({ where: { companyId: context.company.id } }),
  ]);
  if (!plan || plan.priceCents <= 0) return Response.json({ error: "Selecione um plano pago disponível." }, { status: 404 });
  if (!subscription) return Response.json({ error: "Assinatura da empresa não encontrada." }, { status: 404 });
  if (subscription.providerSubscriptionId && subscription.status !== "CANCELED") {
    if (subscription.pendingPlanId === plan.id && subscription.checkoutUrl) return Response.json({ checkoutUrl: subscription.checkoutUrl });
    return Response.json({ error: "Já existe uma assinatura vinculada. Cancele-a no provedor antes de iniciar outra." }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return Response.json({ error: "Configure NEXT_PUBLIC_APP_URL para ativar o checkout." }, { status: 503 });
  let backUrl: string;
  try { backUrl = new URL("/painel/assinatura?checkout=return", appUrl).toString(); } catch { return Response.json({ error: "URL pública do aplicativo inválida." }, { status: 503 }); }
  try {
    const checkout = await mercadoPagoRequest<{ id: string; init_point?: string; sandbox_init_point?: string }>("/preapproval", {
      method: "POST",
      headers: { "X-Idempotency-Key": `${context.company.id}-${plan.id}-${Math.floor(Date.now() / 60_000)}` },
      body: JSON.stringify({
        reason: `PedidoPro ${plan.name}`,
        external_reference: `${context.company.id}:${plan.id}`,
        payer_email: context.user.email,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.priceCents / 100, currency_id: "BRL" },
        back_url: backUrl,
        status: "pending",
      }),
    });
    const checkoutUrl = checkout.init_point ?? checkout.sandbox_init_point;
    if (!checkout.id || !checkoutUrl || !isMercadoPagoCheckoutUrl(checkoutUrl)) throw new Error("O provedor não retornou um checkout válido.");
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({ where: { id: subscription.id }, data: { provider: "MERCADO_PAGO", providerSubscriptionId: checkout.id, checkoutUrl, pendingPlanId: plan.id } });
      await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "billing.checkout_created", entity: "Subscription", entityId: subscription.id, metadata: { planCode: plan.code, provider: "MERCADO_PAGO" } } });
    });
    return Response.json({ checkoutUrl });
  } catch {
    return Response.json({ error: "Não foi possível iniciar o checkout. Tente novamente em instantes." }, { status: 502 });
  }
}
