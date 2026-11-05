import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("fluxo crítico", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "Defina E2E_DATABASE_URL para um banco isolado de teste.");
  const prisma = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("cadastro, empresa, produto, pedido, loja, acompanhamento e exclusão", async ({ page, baseURL }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@example.com`;
    const password = "SenhaSegura123";
    const companyName = `Loja E2E ${stamp}`;
    const slug = `loja-e2e-${stamp}`;
    const productName = `Produto E2E ${stamp}`;
    const origin = baseURL!;

    await page.goto("/cadastro");
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="name"]').fill("Teste E2E");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="terms"]').check();
    await page.getByRole("button", { name: /Criar conta/ }).click();
    await expect(page).toHaveURL(/\/configurar-empresa$/);
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="name"]').fill(companyName);
    await page.locator('input[name="slug"]').fill(slug);
    await page.getByRole("button", { name: /Criar minha empresa/ }).click();
    await expect(page).toHaveURL(/\/painel$/);

    const productResponse = await page.request.post("/api/products", {
      headers: { Origin: origin },
      data: { name: productName, priceCents: 1500, stock: 5 },
    });
    expect(productResponse.status()).toBe(201);
    const { product } = await productResponse.json();

    const company = await prisma.company.findUniqueOrThrow({ where: { slug } });
    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: "professional" } });
    await prisma.subscription.update({ where: { companyId: company.id }, data: { planId: plan.id, status: "ACTIVE" } });

    const orderResponse = await page.request.post("/api/orders", {
      headers: { Origin: origin },
      data: { paymentMethod: "PIX", fulfillment: "PICKUP", items: [{ productId: product.id, quantity: 1 }] },
    });
    expect(orderResponse.status()).toBe(201);

    const publicOrderResponse = await page.request.post(`/api/public/loja/${slug}`, {
      headers: { Origin: origin },
      data: {
        name: "Cliente E2E",
        phone: `119${stamp}`.slice(0, 11),
        email: `cliente-${stamp}@example.com`,
        fulfillment: "PICKUP",
        paymentMethod: "PIX",
        items: [{ productId: product.id, quantity: 1 }],
      },
    });
    expect(publicOrderResponse.status()).toBe(201);
    const publicOrder = await publicOrderResponse.json();

    await page.goto(`/loja/${slug}`);
    await expect(page.getByRole("heading", { name: productName })).toBeVisible();

    await page.goto(`/acompanhar/${publicOrder.order.publicToken}`);
    await expect(page.getByText(`Pedido #${publicOrder.order.number}`)).toBeVisible();

    const publicOrderRecord = await prisma.order.findUniqueOrThrow({ where: { publicToken: publicOrder.order.publicToken }, select: { id: true } });
    const statusResponse = await page.request.patch(`/api/orders/${publicOrderRecord.id}/status`, {
      headers: { Origin: origin },
      data: { status: "PREPARING" },
    });
    expect(statusResponse.status()).toBe(200);

    await page.goto(`/acompanhar/${publicOrder.order.publicToken}`);
    await expect(page.getByText("Em preparação")).toBeVisible();

    await page.goto("/painel/conta");
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmation"]').fill("EXCLUIR");
    await page.getByRole("button", { name: /Excluir minha conta/ }).click();
    await expect(page).toHaveURL(/\/(login)?$/);
    await expect.poll(async () => prisma.company.findUnique({ where: { slug } })).toBeNull();
  });
});
