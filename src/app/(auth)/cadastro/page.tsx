import { authEmailConfigured } from "@/lib/email";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  return <main className="min-h-screen grid md:grid-cols-2 bg-white"><div className="hidden md:flex flex-col justify-between bg-[#163d2e] p-12 text-white"><Logo className="mb-4" width={36} height={20}/><div><p className="text-sm uppercase tracking-[.18em] text-[#a4cbb7]">Comece pelo essencial</p><h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">Sua rotina de vendas em um só lugar.</h1><p className="mt-5 max-w-md text-sm leading-6 text-[#c4dace]">Organize pedidos, produtos e clientes com uma ferramenta feita para pequenos negócios.</p></div><p className="text-xs text-[#a4cbb7]">Plano gratuito disponível · Sem cobrança para começar</p></div><div className="flex items-center justify-center px-6 py-12"><div className="w-full max-w-sm"><p className="text-xs font-semibold uppercase tracking-widest text-[#177a56]">Ordexa</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Crie sua conta</h2><p className="mt-2 text-sm text-[#748078]">Leva só alguns minutos para começar.</p><div className="mt-8"><AuthForm mode="signup" emailVerificationRequired={authEmailConfigured} /></div><p className="mt-6 text-center text-sm text-[#748078]">Já tem conta? <Link className="font-semibold text-[#177a56]" href="/login">Entrar</Link></p></div></div></main>;
}
