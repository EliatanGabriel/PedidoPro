import Link from "next/link";

export function AccessDenied(){return <div className="content"><p className="eyebrow">Acesso restrito</p><h1 className="page-title">Você não tem permissão para acessar esta área.</h1><p className="page-subtitle">Peça ao proprietário da empresa para revisar suas permissões.</p></div>}

export function PlanRequired({feature}:{feature:string}){return <div className="content"><p className="eyebrow">Recurso do plano</p><h1 className="page-title">{feature} não está disponível na assinatura atual.</h1><p className="page-subtitle">Consulte os planos e fale com o administrador da empresa para solicitar uma mudança.</p><Link href="/painel/assinatura" className="button mt-5 inline-block">Ver assinatura</Link></div>}
