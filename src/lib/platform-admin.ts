import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getPlatformAdmin() {
  const session=await auth.api.getSession({headers:await headers()});
  if(!session)return null;
  const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,name:true,email:true,platformRole:true}});
  if(user?.platformRole!=="PLATFORM_ADMIN")return null;
  return user;
}
