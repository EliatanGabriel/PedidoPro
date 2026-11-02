import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTenantPermission } from "@/lib/tenant-permissions";

export async function getTenantContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const membership = await prisma.companyMember.findFirst({
    where: { userId: session.user.id },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;
  return { user: session.user, membership, company: membership.company };
}

export function can(context: NonNullable<Awaited<ReturnType<typeof getTenantContext>>>, permission: string) {
  return hasTenantPermission(context.membership.role, context.membership.permissions, context.company.isActive, permission);
}
