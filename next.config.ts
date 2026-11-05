import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { useTypeScriptCli: false, webpackBuildWorker: false },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; script-src 'self' ${process.env.NODE_ENV !== "production" ? "'unsafe-eval' 'unsafe-inline'" : "'unsafe-inline'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none';${process.env.NODE_ENV === "production" ? " upgrade-insecure-requests;" : ""}`,
        },
        ...(process.env.NODE_ENV === "production" ? [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ] : []),
      ],
    }];
  },
};

export default nextConfig;
