import type { MetadataRoute } from "next";

function appOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appOrigin();
  const lastModified = new Date();
  return [
    { url: new URL("/", origin).toString(), lastModified, changeFrequency: "daily", priority: 1 },
    { url: new URL("/precos", origin).toString(), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: new URL("/cadastro", origin).toString(), lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: new URL("/login", origin).toString(), lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: new URL("/termos", origin).toString(), lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: new URL("/politica-de-privacidade", origin).toString(), lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
