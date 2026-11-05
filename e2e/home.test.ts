import { test, expect } from "@playwright/test";

test("home page loads and shows main navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Ordexa/);
  await expect(page.getByRole("link", { name: /Começar grátis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Entrar/i })).toBeVisible();
  await expect(page.getByText(/Mais clareza para cada pedido/i)).toBeVisible();
});

test("pricing page loads and lists plans", async ({ page }) => {
  await page.goto("/precos");
  await expect(page.getByRole("heading", { name: /Comece no seu ritmo/i })).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Bem-vindo de volta/i })).toBeVisible();
  await expect(page.getByLabel(/E-mail/i)).toBeVisible();
  await expect(page.getByLabel(/Senha/i)).toBeVisible();
});

test("cadastro page loads", async ({ page }) => {
  await page.goto("/cadastro");
  await expect(page.getByRole("heading", { name: /Crie sua conta/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Criar conta/i })).toBeVisible();
});
