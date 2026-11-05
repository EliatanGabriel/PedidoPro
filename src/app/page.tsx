import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";

const features = [
  {
    icon: ClipboardList,
    title: "Pedidos organizados",
    desc: "Registre pedidos, acompanhe status e visualize o faturamento diário em um só lugar.",
  },
  {
    icon: Boxes,
    title: "Controle de estoque",
    desc: "Acompanhe produtos, categorias e níveis mínimos para nunca faltar ou sobrar mercadoria.",
  },
  {
    icon: Users,
    title: "Clientes e entregas",
    desc: "Cadastre clientes, defina endereços e registre se a entrega foi retirada ou enviada.",
  },
  {
    icon: ShieldCheck,
    title: "Dados seguros",
    desc: "Sua operação protegida com backups, permissões de equipe e LGPD em mente.",
  },
];

const steps = [
  {
    number: "01",
    title: "Cadastre sua empresa",
    desc: "Crie sua conta, defina o nome da loja e configure horário e formas de pagamento.",
  },
  {
    number: "02",
    title: "Adicione produtos e clientes",
    desc: "Cadastre seu catálogo com preços, estoque e seus clientes frequentes.",
  },
  {
    number: "03",
    title: "Comece a vender",
    desc: "Abra pedidos, registre pagamentos e acompanhe tudo pelo painel ou pela loja pública.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      <nav className="fixed z-40 top-0 left-0 right-0 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="ml-1" width={40} height={22} />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#66736b] font-medium">
            <Link href="#recursos" className="hover:text-[#177a56] transition">
              Recursos
            </Link>
            <Link href="#como-funciona" className="hover:text-[#177a56] transition">
              Como funciona
            </Link>
            <Link href="/precos" className="hover:text-[#177a56] transition">
              Preços
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[#506158] font-semibold hover:text-[#177a56] transition">
              Entrar
            </Link>
            <Link href="/cadastro" className="button px-5 py-2.5 text-sm">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up delay-100">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#edf6f1] px-3 py-1.5 text-xs font-semibold text-[#177a56]">
                <span className="relative flex h-1.5 w-1.5 rounded-full bg-[#177a56] overflow-hidden">
                  <span className="animate-[bounce_1s_infinite] absolute left-0 top-0 h-full w-full bg-[#177a56]" />
                </span>
                Gestão simples para pequenos negócios
              </p>
              <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-.05em] text-[#19372b] lg:text-6xl">
                Mais clareza para cada pedido.{" "}
                <span className="block mt-2 text-[#177a56]">Menos trabalho para você.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-[#718078]">
                Organize vendas, produtos e clientes em um painel prático para
                acompanhar seu negócio todos os dias. Plano gratuito para
                começar, sem cartão de crédito.
              </p>
              <div className="mt-10 flex flex-wrap gap-4 animate-fade-in-up delay-200">
                <Link
                  href="/cadastro"
                  className="button inline-flex items-center gap-2 px-6 py-3.5 text-base"
                >
                  Criar conta grátis <ArrowRight size={16} />
                </Link>
                <Link
                  href="#recursos"
                  className="button secondary px-6 py-3.5 text-base"
                >
                  Conhecer recursos
                </Link>
              </div>
              <p className="mt-6 text-xs text-[#89958d] animate-fade-in-up delay-300">
                Sem compromisso · Cancela a qualquer momento
              </p>
            </div>
            <div className="relative hidden lg:block animate-fade-in-up delay-400">
              <div className="relative rounded-2xl border border-[#e5ece7] bg-[#f7faf8] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-[#87928b]">Visão geral</p>
                    <p className="text-lg font-semibold">Sua operação</p>
                  </div>
                  <span className="rounded-full bg-[#edf6f1] px-3 py-1 text-[10px] font-bold text-[#177a56]">
                    Demonstração
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl border border-[#e5ece7] bg-white p-4">
                    <p className="text-xs text-[#87928b]">Hoje</p>
                    <p className="mt-1 text-2xl font-bold">R$ 0,00</p>
                  </div>
                  <div className="rounded-xl border border-[#e5ece7] bg-white p-4">
                    <p className="text-xs text-[#87928b]">Pedidos</p>
                    <p className="mt-1 text-2xl font-bold">—</p>
                  </div>
                </div>
                <div className="h-32 rounded-xl border border-[#e5ece7] bg-white p-4">
                  <div className="flex justify-between mb-2 text-xs text-[#718078]">
                    <span>Pedidos da semana</span>
                    <span>—</span>
                  </div>
                  <div className="flex h-full items-end gap-1">
                    {[20, 45, 30, 60, 40, 80, 50].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-[#177a56] opacity-40"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 rounded-xl border border-[#e5ece7] bg-white p-4 shadow-lg animate-slide-in-right delay-500">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-[#edf6f1] flex items-center justify-center text-[#177a56] font-bold">
                    +
                  </div>
                  <div>
                    <p className="text-xs text-[#87928b]">Novo pedido</p>
                    <p className="text-sm font-semibold">#1.204 · R$ 189,90</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="py-24 px-6 bg-[#f7f9f7]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-[#19372b] lg:text-4xl">
              Tudo o que o seu negócio precisa
            </h2>
            <p className="mt-4 text-[#718078] leading-relaxed max-w-2xl mx-auto">
              Recursos pensados para rotinas de venda pequenas, mas com a
              organização de uma operação grande.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`rounded-xl border border-[#e5ebe6] bg-white p-6 hover:border-[#177a56]/50 transition animate-fade-in-up ${i === 0 ? "delay-100" : i === 1 ? "delay-200" : i === 2 ? "delay-300" : "delay-400"}`}
              >
                <div className="rounded-lg bg-[#edf6f1] p-3 text-[#177a56] inline-flex mb-4">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-[#19372b] mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-xs text-[#718078] leading-5 line-clamp-3">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-[#19372b] lg:text-4xl">
              Como funciona na prática
            </h2>
            <p className="mt-4 text-[#718078]">
              Três passos para tirar o caos do seu dia a dia de vendas.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 150}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-[#177a56] px-3 py-1 text-xs font-bold text-white">
                    {step.number}
                  </div>
                  <h3 className="text-base font-semibold text-[#19372b]">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-[#718078] leading-6">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precos" className="py-24 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl font-bold text-[#19372b] lg:text-4xl">
              Escolha o plano ideal
            </h2>
            <p className="mt-4 text-[#718078] leading-relaxed">
              Comece grátis e evolua quando precisar de mais recursos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div
              className={`rounded-2xl border border-[#e5ebe6] bg-white p-8 animate-fade-in-up delay-100 relative`}
            >
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6f1] px-2 py-1 text-xs font-bold text-[#177a56] mb-4">
                  Plano inicial
                </span>
                <h3 className="text-xl font-bold text-[#19372b]">Gratuito</h3>
                <p className="mt-1 text-4xl font-bold text-[#177a56]">R$ 0</p>
                <p className="text-xs text-[#718078] mt-1">por mês</p>
              </div>
              <ul className="mt-8 space-y-4 text-sm text-[#718078]">
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Até 300 pedidos/mês
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Até 200 produtos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Até 3 usuários
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Relatórios
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Controle de despesas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Controle de estoque
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Loja pública
                </li>
              </ul>
              <div className="mt-10">
                <Link
                  href="/cadastro"
                  className="button w-full py-3"
                >
                  Começar grátis
                </Link>
              </div>
            </div>
            <div
              className={`rounded-2xl border-2 border-[#177a56] bg-[#edf6f1] p-8 animate-fade-in-up delay-200 relative`}
            >
              <div className="absolute top-4 right-4 rounded-full bg-[#177a56] px-2 py-1 text-xs font-bold text-white">
                Mais vendido
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#177a56] px-2 py-1 text-xs font-bold text-white mb-4">
                  Plano Pro
                </span>
                <h3 className="text-xl font-bold text-[#19372b]">Pro</h3>
                <p className="mt-1 text-4xl font-bold text-[#177a56]">R$ 29,90</p>
                <p className="text-xs text-[#718078] mt-1">por mês</p>
              </div>
              <ul className="mt-8 space-y-4 text-sm text-[#718078]">
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Tudo do plano Gratuito
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Pedidos ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Produtos ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Até 10 usuários
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#177a56]">✓</span> Relatórios avançados
                </li>
              </ul>
              <div className="mt-10">
                <Link
                  href="/cadastro"
                  className="button w-full py-3 bg-[#177a56] hover:bg-[#156c48]"
                >
                  Escolher Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5ece7] bg-[#f7faf8] py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#748078]">
          <div className="flex items-center gap-2">
            <Logo width={18} height={10} />
            <span className="font-semibold text-[#19372b]">Ordexa</span>
          </div>
          <div className="flex gap-6">
            <Link href="/termos" className="hover:text-[#177a56] transition">
              Termos de uso
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-[#177a56] transition">
              Privacidade
            </Link>
          </div>
          <p>Ordexa · Gestão de pedidos</p>
        </div>
      </footer>
    </main>
  );
}
