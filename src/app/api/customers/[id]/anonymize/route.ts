import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_customers")) return Response.json({ error: "Sem permissão para anonimizar clientes." }, { status: 403 });

  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, companyId: context.company.id }, select: { id: true } });
  if (!customer) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    const relatedOrders = await tx.order.findMany({ where: { companyId: context.company.id, customerId: customer.id }, select: { id: true } });
    const orderIds = relatedOrders.map((order) => order.id);
    if (orderIds.length) {
      await tx.order.updateMany({ where: { companyId: context.company.id, id: { in: orderIds } }, data: { recipientName: null, recipientPhone: null, deliveryAddress: null, notes: null } });
      await tx.delivery.updateMany({ where: { orderId: { in: orderIds } }, data: { recipientName: null, recipientPhone: null, address: null, notes: null } });
      await tx.payment.updateMany({ where: { orderId: { in: orderIds } }, data: { transactionReference: null, notes: null, refundReference: null, refundReason: null } });
    }
    await tx.customer.update({
      where: { id: customer.id },
      data: { name: `Cliente anonimizado ${customer.id.slice(-6)}`, phone: null, email: null, taxId: null, address: null, city: null, state: null, postalCode: null, notes: null },
    });
    await tx.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "customer.anonymized", entity: "Customer", entityId: customer.id } });
  });
  return Response.json({ ok: true });
}
