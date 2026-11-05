import { loadEnvFile } from "node:process";
import { inspectEnv } from "../src/lib/env";

try {
  loadEnvFile(".env");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
}

const strict = process.argv.includes("--strict");
const issues = inspectEnv(strict ? { ...process.env, NODE_ENV: "production" } : process.env);
const errors = issues.filter((issue) => issue.severity === "error");
const warnings = issues.filter((issue) => issue.severity === "warning");

for (const issue of issues) {
  const label = issue.severity === "error" ? "ERRO" : "AVISO";
  console.log(`[${label}] ${issue.key}: ${issue.message}`);
}

if (!issues.length) console.log("Ambiente configurado sem avisos.");
if (strict && warnings.length) console.log("Modo estrito: avisos também impedem a publicação.");

process.exitCode = errors.length || (strict && warnings.length) ? 1 : 0;
