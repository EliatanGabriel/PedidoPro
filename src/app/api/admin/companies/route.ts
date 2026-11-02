import { getPlatformAdmin } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";
export async function GET(){const admin=await getPlatformAdmin();if(!admin)return Response.json({error:"Acesso restrito."},{status:403});const companies=await prisma.company.findMany({include:{_count:{select:{members:true,orders:true,products:true}},subscription:{include:{plan:{select:{name:true}}}}},orderBy:{createdAt:"desc"},take:500});return Response.json({companies});}
