import Link from "next/link";
import { Logo } from "@/components/logo";

export function AuthNavbar() {
  return (
    <nav className="fixed z-40 top-0 left-0 right-0 px-6 py-4 border-b border-[#e5ebe6] bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo width={40} height={22} />
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-[#66736b] font-medium">
          <Link href="/" className="hover:text-[#177a56] transition">
            Início
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
  );
}
