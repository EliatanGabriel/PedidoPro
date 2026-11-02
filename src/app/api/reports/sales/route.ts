import { can, getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { hasPlanFeature } from "@/lib/plans";

function csvCell(value: string | number) { return `"${String(value).replaceAll('"','""')}"`; }

export async function GET(request: Request) {
  const context=await getTenantContext(); if(!context)return Response.json({error:"Empresa não configurada."},{status:401});if(!can(context,"view_reports"))return Response.json({error:"Sem permissão para consultar relatórios."},{status:403});if(!await hasPlanFeature(context.company.id,"reports"))return Response.json({error:"Relatórios não estão disponíveis no plano atual."},{status:402});
  const url=new URL(request.url);const startParam=url.searchParams.get("from");const endParam=url.searchParams.get("to");
  const start=startParam?new Date(startParam):new Date(new Date().getFullYear(),new Date().getMonth(),1);const end=endParam?new Date(endParam):new Date();
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>end)return Response.json({error:"Período inválido."},{status:400});
  const orders=await prisma.order.findMany({where:{companyId:context.company.id,createdAt:{gte:start,lte:end},status:{not:"CANCELED"}},include:{items:true,payments:{where:{status:"PAID"},select:{amountCents:true}}},orderBy:{createdAt:"asc"}});
  const rows=[["pedido","data","status","itens","receita_bruta_centavos","descontos_centavos","pagamentos_recebidos_centavos"],...orders.map((order)=>[String(order.number),order.createdAt.toISOString(),order.status,String(order.items.reduce((n,item)=>n+item.quantity,0)),String(order.subtotalCents+order.deliveryCents),String(order.discountCents),String(order.payments.reduce((sum,payment)=>sum+payment.amountCents,0))])];
  const csv="\uFEFF"+rows.map((row)=>row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=pedidopro-vendas.csv","Cache-Control":"private, no-store"}});
}
