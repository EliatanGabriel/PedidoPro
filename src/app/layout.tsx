import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ordexa — Gestão de pedidos",
  description: "Pedidos, estoque e clientes em um só lugar.",
  icons: [
    { rel: "icon", type: "image/x-icon", url: "/favicon.ico" },
    { rel: "icon", type: "image/png", sizes: "32x32", url: "/favicon-32x32.png" },
    { rel: "icon", type: "image/png", sizes: "16x16", url: "/favicon-16x16.png" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    { rel: "icon", type: "image/png", sizes: "192x192", url: "/android-chrome-192x192.png" },
    { rel: "icon", type: "image/png", sizes: "512x512", url: "/android-chrome-512x512.png" },
  ],
};

const themeScript = `(function(){try{var stored=localStorage.getItem("ordexa-theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: themeScript }}/>{children}</body></html>;
}
