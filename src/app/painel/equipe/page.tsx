import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { TeamManager } from "@/components/team-manager";
import { AccessDenied } from "@/components/access-denied";
export default async function TeamPage(){const context=await getTenantContext();if(!context)return null;if(context.membership.role!=="OWNER")return <AccessDenied/>;const members=await prisma.companyMember.findMany({where:{companyId:context.company.id},include:{user:{select:{name:true,email:true}}},orderBy:{createdAt:"asc"}});return <div className="content"><p className="eyebrow">Sua empresa</p><h1 className="page-title">Equipe</h1><p className="page-subtitle">Gerencie acessos e permissões da empresa.</p><section className="card mt-6 max-w-3xl p-5"><TeamManager initial={members.map(member=>({id:member.id,user:member.user,role:member.role,permissions:member.permissions}))}/></section></div>}
