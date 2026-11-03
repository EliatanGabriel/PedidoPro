import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_customers")) return Response.json({ error: "Sem permissão para exportar dados de clientes." }, { status: 403 });
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, companyId: context.company.id },
    select: {
      id: true, name: true, phone: true, email: true, taxId: true, address: true,
      city: true, state: true, postalCode: true, notes: true, createdAt: true, updatedAt: true,
      orders: {
        where: { companyId: context.company.id },
        orderBy: { createdAt: "desc" },
        select: {
          number: true, status: true, fulfillment: true, paymentMethod: true, paymentStatus: true,
          subtotalCents: true, discountCents: true, deliveryCents: true, totalCents: true,
          recipientName: true, recipientPhone: true, deliveryAddress: true, notes: true, createdAt: true, updatedAt: true,
          items: { select: { productName: true, quantity: true, unitPriceCents: true, totalCents: true } },
          payments: { select: { amountCents: true, method: true, status: true, transactionReference: true, notes: true, paidAt: true, refundedAt: true, refundReference: true, refundReason: true } },
          delivery: { select: { address: true, recipientName: true, recipientPhone: true, status: true, expectedAt: true, completedAt: true } },
        },
      },
    },
  });
  if (!customer) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });
  await prisma.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "customer.data_exported", entity: "Customer", entityId: customer.id } });
  const payload = { exportedAt: new Date().toISOString(), company: context.company.name, customer };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ordexa-cliente-${customer.id}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
