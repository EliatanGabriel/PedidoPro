import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";

const schema = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).optional(), email: z.email().optional().or(z.literal("")), taxId: z.string().trim().max(20).optional(), address: z.string().trim().max(200).optional(), city: z.string().trim().max(80).optional(), state: z.string().trim().max(2).optional(), postalCode: z.string().trim().max(10).optional(), notes: z.string().trim().max(1000).optional() });

export async function GET() {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_customers")) return Response.json({ error: "Sem permissão para consultar clientes." }, { status: 403 });
  const customers = await prisma.customer.findMany({ where: { companyId: context.company.id }, orderBy: { name: "asc" }, take: 500 });
  return Response.json({ customers });
}

export async function POST(request: Request) {
  const context = await getTenantContext();
  if (!context) return Response.json({ error: "Empresa não configurada." }, { status: 401 });
  if (!can(context, "manage_customers")) return Response.json({ error: "Sem permissão para cadastrar clientes." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Revise os dados do cliente." }, { status: 400 });
  const data = parsed.data;
  const duplicate = await prisma.customer.findFirst({ where: { companyId: context.company.id, OR: [...(data.phone ? [{ phone: data.phone }] : []), ...(data.email ? [{ email: data.email }] : []), ...(data.taxId ? [{ taxId: data.taxId }] : [])] } });
  if (duplicate) return Response.json({ error: "Já existe um cliente com este telefone ou e-mail." }, { status: 409 });
  const customer = await prisma.customer.create({ data: { ...data, phone: data.phone || null, email: data.email || null, taxId: data.taxId || null, companyId: context.company.id } });
  await prisma.auditLog.create({ data: { companyId: context.company.id, userId: context.user.id, action: "customer.created", entity: "Customer", entityId: customer.id } });
  return Response.json({ customer }, { status: 201 });
}
