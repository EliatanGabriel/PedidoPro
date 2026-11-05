import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (e2eDatabaseUrl) {
  const databaseName = new URL(e2eDatabaseUrl).pathname.replace(/^\//, "");
  if (!/test|e2e/i.test(databaseName)) {
    throw new Error("E2E_DATABASE_URL precisa apontar para um banco isolado com 'test' ou 'e2e' no nome.");
  }
}

function definedEnv(env: NodeJS.ProcessEnv) {
  return Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

const webServerEnv = e2eDatabaseUrl
  ? definedEnv({
      ...process.env,
      DATABASE_URL: e2eDatabaseUrl,
      BETTER_AUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-only-secret-with-at-least-32-characters",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      TRUST_PROXY: "false",
      DISABLE_AUTH_RATE_LIMIT: "true",
    })
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: e2eDatabaseUrl ? "npx prisma migrate deploy && npx prisma db seed && npm run dev" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI && !e2eDatabaseUrl,
    timeout: 120_000,
    env: webServerEnv,
  },
});
