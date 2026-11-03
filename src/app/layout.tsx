import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Ordexa — Gestão de pedidos", description: "Pedidos, estoque e clientes em um só lugar." };

const themeScript = `(function(){try{var stored=localStorage.getItem("ordexa-theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: themeScript }}/>{children}</body></html>;
}
