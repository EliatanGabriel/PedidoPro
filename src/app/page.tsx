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
            <Logo className="ml-1" width={26} height={15} />
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
            <p className="mt-4 text-[#718078] leading-relaxed">
              Recursos pensados para rotinas de venda pequenas, mas com a
              organização de uma operação grande.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[#e5ebe6] bg-white p-6 hover:border-[#177a56]/50 transition animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 100}ms` }}
              >
                <div className="rounded-lg bg-[#edf6f1] p-3 text-[#177a56] mb-4 inline-flex">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-sm font-semibold text-[#19372b] mb-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-[#718078] leading-5">{feature.desc}</p>
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

      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#e5ece7] bg-[#163d2e] p-8 md:p-12 text-center animate-fade-in-up">
          <h2 className="text-3xl font-bold text-white lg:text-4xl">
            Pronto para organizar seu negócio?
          </h2>
          <p className="mt-4 text-[#b7d8c7] leading-relaxed">
            Comece no plano gratuito. Sem cartão de crédito, sem compromisso.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cadastro"
              className="button flex-1 sm:w-auto px-8 py-3 text-base"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="button secondary flex-1 sm:w-auto px-8 py-3 text-base border border-white/30 text-white"
            >
              Já tenho conta
            </Link>
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
