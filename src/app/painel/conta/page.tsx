import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { DeleteAccountForm } from "@/components/delete-account-form";

export default async function AccountPage() {
  const context = await getTenantContext();
  if (!context) return null;

  const company = await prisma.company.findUnique({
    where: { id: context.company.id },
    select: {
      members: { select: { id: true } },
      subscription: { select: { provider: true, status: true } },
    },
  });

  const memberCount = company?.members.length ?? 1;
  const hasActiveProviderSubscription = company?.subscription?.provider === "CAKTO" && company.subscription.status === "ACTIVE";
  const blockedReason = context.membership.role === "OWNER" && memberCount > 1
    ? "Sua conta é proprietária de uma empresa com outras pessoas na equipe. Remova os demais membros em Equipe antes de excluir a conta."
    : hasActiveProviderSubscription
      ? "Existe uma assinatura ativa na Cakto. Cancele a assinatura antes de excluir a conta."
      : null;

  return <div className="content">
    <p className="eyebrow">Sua conta</p>
    <h1 className="page-title">Minha conta</h1>
    <p className="page-subtitle">Dados de acesso e opções de privacidade da sua conta Ordexa.</p>

    <section className="card mt-6 max-w-3xl p-5">
      <h2 className="section-title">Dados de acesso</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-[#748078]">Nome</dt><dd className="mt-1 font-semibold">{context.user.name}</dd></div>
        <div><dt className="text-xs text-[#748078]">E-mail</dt><dd className="mt-1 font-semibold">{context.user.email}</dd></div>
        <div><dt className="text-xs text-[#748078]">Empresa</dt><dd className="mt-1 font-semibold">{context.company.name}</dd></div>
        <div><dt className="text-xs text-[#748078]">Perfil</dt><dd className="mt-1 font-semibold">{context.membership.role === "OWNER" ? "Proprietário" : "Funcionário"}</dd></div>
      </dl>
    </section>

    <section className="card mt-5 max-w-3xl border-red-200 p-5">
      <h2 className="section-title text-red-800">Excluir conta</h2>
      <p className="mt-3 text-sm leading-6 text-[#59675f]">
        Esta ação é permanente. Se você for o proprietário e não houver outros membros, a empresa, produtos, pedidos, clientes e demais dados vinculados também serão excluídos. Registros de auditoria podem ser mantidos sem dados pessoais.
      </p>
      <div className="mt-4"><DeleteAccountForm blockedReason={blockedReason} /></div>
    </section>
  </div>;
}
