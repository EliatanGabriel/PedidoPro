import { getPlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
export async function GET(){if(!await getPlatformAdmin())return Response.json({error:"Acesso restrito."},{status:403});return Response.json({plans:await prisma.plan.findMany({orderBy:{priceCents:"asc"}})});}
