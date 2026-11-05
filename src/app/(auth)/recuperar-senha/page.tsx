import { authEmailConfigured } from "@/lib/email";
import { AccountEmailForm } from "@/components/account-email-form";
import { Logo } from "@/components/logo";

export default function RecoverPasswordPage() {
  return <main className="grid min-h-screen place-items-center bg-[#f7f9f7] px-5 py-12"><section className="card w-full max-w-md p-7"><Logo className="mb-4" width={30} height={17}/><p className="eyebrow mt-8">Acesso à conta</p><h1 className="mt-2 text-2xl font-bold">Recuperar senha</h1><p className="mt-2 text-sm leading-6 text-[#748078]">Informe o e-mail usado no cadastro. Se a conta existir, enviaremos um link temporário.</p><AccountEmailForm mode="recovery" enabled={authEmailConfigured}/></section></main>;
}
