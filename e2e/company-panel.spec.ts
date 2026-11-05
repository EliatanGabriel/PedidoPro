import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("painel da empresa", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "Defina E2E_DATABASE_URL para um banco isolado de teste.");
  const prisma = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("percorre todos os módulos do painel da empresa", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const email = `painel-e2e-${stamp}@example.com`;
    const password = "SenhaSegura123";
    const companyName = `Painel E2E ${stamp}`;
    const slug = `painel-e2e-${stamp}`;
    const productName = `Produto Painel ${stamp}`;
    const origin = baseURL!;
    let companyId: string | undefined;
    let userId: string | undefined;

    try {
      await page.goto("/cadastro");
      await page.waitForLoadState("networkidle");
      await page.locator('input[name="name"]').fill("Dono E2E");
      await page.locator('input[name="email"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="terms"]').check();
      await page.getByRole("button", { name: /Criar conta/ }).click();
      await expect(page).toHaveURL(/\/configurar-empresa$/);

      await page.locator('input[name="name"]').fill(companyName);
      await page.locator('input[name="slug"]').fill(slug);
      await page.getByRole("button", { name: /Criar minha empresa/ }).click();
      await expect(page).toHaveURL(/\/painel$/);

      const company = await prisma.company.findUniqueOrThrow({ where: { slug } });
      companyId = company.id;
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      userId = user.id;
      const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "professional" } });
      await prisma.subscription.update({ where: { companyId: company.id }, data: { planId: plan.id, status: "ACTIVE" } });

      const productResponse = await page.request.post("/api/products", {
        headers: { Origin: origin },
        data: { name: productName, priceCents: 1500, stock: 4 },
      });
      expect(productResponse.status()).toBe(201);

      const modules: [string, string | RegExp][] = [
        ["/painel", /^(Bom dia|Boa tarde|Boa noite),/],
        ["/painel/pedidos", "Pedidos"],
        ["/painel/pedidos/novo", "Novo pedido"],
        ["/painel/produtos", "Produtos"],
        ["/painel/estoque", "Estoque"],
        ["/painel/entregas", "Entregas"],
        ["/painel/clientes", "Clientes"],
        ["/painel/relatorios", "Relatórios"],
        ["/painel/despesas", "Despesas"],
        ["/painel/configuracoes", "Configurações"],
        ["/painel/equipe", "Equipe"],
        ["/painel/privacidade", "Solicitações de privacidade"],
        ["/painel/assinatura", "Assinatura"],
        ["/painel/conta", "Minha conta"],
      ];
      for (const [path, title] of modules) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
        await expect(page.getByText("Algo deu errado")).toHaveCount(0);
      }

      await page.goto("/painel/produtos");
      await expect(page.getByText(productName).first()).toBeVisible();
      await page.goto("/painel/assinatura");
      await expect(page.getByText("Profissional").first()).toBeVisible();
    } finally {
      if (companyId) await prisma.company.delete({ where: { id: companyId } }).catch(() => undefined);
      if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });
});
