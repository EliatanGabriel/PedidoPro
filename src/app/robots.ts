import type { MetadataRoute } from "next";

function appOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function robots(): MetadataRoute.Robots {
  const origin = appOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/painel", "/configurar-empresa", "/acompanhar/", "/api/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", origin).toString(),
    host: origin,
  };
}
