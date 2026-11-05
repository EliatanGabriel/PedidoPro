import { describe, expect, it } from "vitest";
import { newOrderEmailContent, orderStatusEmailContent } from "@/lib/notifications";

describe("notificações transacionais", () => {
  it("escapa dados do cliente no e-mail de novo pedido", () => {
    const content = newOrderEmailContent({
      companyName: "Loja <Teste>",
      orderNumber: 12,
      customerName: "<script>alert(1)</script>",
      itemCount: 2,
      totalCents: 5000,
      orderUrl: "https://app.example/painel/pedidos/abc",
    });
    expect(content.subject).toContain("#12");
    expect(content.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(content.html).toContain("Loja &lt;Teste&gt;");
    expect(content.text).toContain("https://app.example/painel/pedidos/abc");
  });

  it("usa o rótulo em português no e-mail de status", () => {
    const content = orderStatusEmailContent({
      companyName: "Loja",
      orderNumber: 7,
      status: "READY_FOR_PICKUP",
      trackingUrl: "https://app.example/acompanhar/token",
    });
    expect(content.subject).toBe("Pedido #7: Pronto para retirada");
    expect(content.html).toContain("Pronto para retirada");
    expect(content.text).toContain("https://app.example/acompanhar/token");
  });
});
