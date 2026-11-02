import { expect, test } from "@playwright/test";

test("landing page links to account creation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /mais clareza para cada pedido/i })).toBeVisible();
  await page.getByRole("link", { name: /criar conta grátis/i }).click();
  await expect(page).toHaveURL(/cadastro/);
  await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
});

test("sign in page exposes accessible credential fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
});

test("password recovery page exposes the email request form", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await expect(page.getByRole("heading", { name: "Recuperar senha" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar instruções" })).toBeVisible();
});

test("password reset page rejects a missing token without submitting", async ({ page }) => {
  await page.goto("/redefinir-senha");
  await expect(page.getByRole("heading", { name: "Crie uma nova senha" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redefinir senha" })).toBeDisabled();
});

test("email verification page provides the resend form", async ({ page }) => {
  await page.goto("/verificar-email?email=cliente%40exemplo.com");
  await expect(page.getByRole("heading", { name: "Verifique seu e-mail" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail" })).toHaveValue("cliente@exemplo.com");
});
