import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("painel administrativo", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "Defina E2E_DATABASE_URL para um banco isolado de teste.");
  const prisma = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("bloqueia acesso comum, libera admin e executa ações críticas", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const email = `admin-e2e-${stamp}@example.com`;
    const password = "SenhaSegura123";
    const companyName = `Empresa Admin ${stamp}`;
    const slug = `empresa-admin-${stamp}`;
    const targetEmail = `alvo-e2e-${stamp}@example.com`;
    const origin = baseURL!;
    let adminId: string | undefined;
    let targetId: string | undefined;
    let companyId: string | undefined;
    let failedEmailId: string | undefined;

    try {
      await page.goto("/cadastro");
      await page.waitForLoadState("networkidle");
      await page.locator('input[name="name"]').fill("Admin E2E");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="terms"]').check();
      await page.getByRole("button", { name: /Criar conta/ }).click();
      await expect(page).toHaveURL(/\/configurar-empresa$/);

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login$/);
      const denied = await page.request.get("/api/admin/companies", { headers: { Origin: origin } });
      expect(denied.status()).toBe(403);

      const admin = await prisma.user.findUniqueOrThrow({ where: { email } });
      adminId = admin.id;
      await prisma.user.update({ where: { id: admin.id }, data: { platformRole: "PLATFORM_ADMIN" } });

      const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "professional" } });
      const company = await prisma.company.create({ data: { name: companyName, slug } });
      companyId = company.id;
      await prisma.subscription.create({ data: { companyId: company.id, planId: plan.id, status: "ACTIVE" } });
      const target = await prisma.user.create({ data: { name: "Alvo E2E", email: targetEmail, emailVerified: true } });
      targetId = target.id;
      const failed = await prisma.emailOutbox.create({
        data: { companyId: company.id, to: targetEmail, subject: `Falha E2E ${stamp}`, text: "falha", html: "<p>falha</p>", status: "FAILED", attempts: 5, lastError: "erro simulado" },
      });
      failedEmailId = failed.id;

      await page.goto("/admin");
      await expect(page.getByRole("heading", { level: 1, name: "Administração" })).toBeVisible();
      await expect(page.getByText("E-mails com falha").first()).toBeVisible();

      const modules: [string, string][] = [
        ["/admin/empresas", "Empresas"],
        ["/admin/usuarios", "Usuários"],
        ["/admin/assinaturas", "Assinaturas"],
        ["/admin/planos", "Planos"],
        ["/admin/operacoes", "Operações"],
        ["/admin/auditoria", "Auditoria"],
      ];
      for (const [path, title] of modules) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
        await expect(page.getByText("Algo deu errado")).toHaveCount(0);
      }

      await page.goto(`/admin/empresas?q=${encodeURIComponent(slug)}`);
      await page.getByRole("link", { name: companyName }).click();
      await expect(page.getByRole("heading", { level: 1, name: companyName })).toBeVisible();
      await expect(page.getByText("Assinatura e uso do plano")).toBeVisible();
      await page.getByRole("button", { name: "Bloquear" }).click();
      await expect.poll(async () => (await prisma.company.findUnique({ where: { id: companyId! }, select: { isActive: true } }))?.isActive).toBe(false);
      await page.getByRole("button", { name: "Reativar" }).click();
      await expect.poll(async () => (await prisma.company.findUnique({ where: { id: companyId! }, select: { isActive: true } }))?.isActive).toBe(true);

      page.on("dialog", (dialog) => void dialog.accept());
      await page.goto(`/admin/usuarios?q=${encodeURIComponent(targetEmail)}`);
      await page.getByRole("button", { name: "Tornar admin" }).click();
      await expect.poll(async () => (await prisma.user.findUnique({ where: { id: targetId! }, select: { platformRole: true } }))?.platformRole).toBe("PLATFORM_ADMIN");

      await page.goto(`/admin/assinaturas?q=${encodeURIComponent(slug)}`);
      await page.getByRole("button", { name: "Gerenciar" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.locator('select[name="status"]').selectOption("PAST_DUE");
      await dialog.getByRole("button", { name: "Salvar alterações" }).click();
      await expect.poll(async () => (await prisma.subscription.findUnique({ where: { companyId: companyId! }, select: { status: true } }))?.status).toBe("PAST_DUE");
      await page.keyboard.press("Escape");

      await page.goto("/admin/operacoes");
      const row = page.locator("tr", { hasText: `Falha E2E ${stamp}` });
      await row.getByRole("button", { name: "Reenviar" }).click();
      await expect.poll(async () => (await prisma.emailOutbox.findUnique({ where: { id: failedEmailId! }, select: { status: true } }))?.status).toBe("PENDING");

      await page.goto("/admin/auditoria?q=platform.email_requeued");
      await expect(page.getByText("platform.email_requeued").first()).toBeVisible();
    } finally {
      if (companyId) await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
      if (adminId) await prisma.user.delete({ where: { id: adminId } }).catch(() => undefined);
      if (targetId) await prisma.user.delete({ where: { id: targetId } }).catch(() => undefined);
    }
  });
});
