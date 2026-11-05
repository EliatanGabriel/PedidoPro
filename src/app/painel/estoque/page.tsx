import { Package } from "lucide-react";
import { can, getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { StockForm } from "@/components/stock-form";
import { AccessDenied, PlanRequired } from "@/components/access-denied";
import { hasPlanFeature } from "@/lib/plans";

export default async function StockPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "manage_stock")) return <AccessDenied />;
  if (!(await hasPlanFeature(context.company.id, "stock"))) return <PlanRequired feature="Gestão de estoque" />;
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: context.company.id, isActive: true },
      select: { id: true, name: true, stock: true, minStock: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { companyId: context.company.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 className="page-title">Estoque</h1>
          <p className="page-subtitle">Ajustes manuais ficam identificados no histórico e na auditoria.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-5">
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Total em estoque</p>
          <p className="text-2xl font-bold">{totalUnits}</p>
          <p className="mt-2 text-[10px] text-[#748078]">Unidades disponíveis</p>
        </article>
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Produtos cadastrados</p>
          <p className="text-2xl font-bold">{products.length}</p>
          <p className="mt-2 text-[10px] text-[#748078]">Itens ativos no catálogo</p>
        </article>
        <article className="card stat-card p-5">
          <p className="text-[10px] text-[#748078] uppercase tracking-wider font-bold">Estoque baixo</p>
          <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-[#15803d]"}`}>
            {lowStockCount}
          </p>
          <p className="mt-2 text-[10px] text-[#748078]">Abaixo do mínimo definido</p>
        </article>
      </div>

      <section className="card mt-5">
        <div className="p-5">
          <h2 className="section-title mb-4">Registrar movimentação</h2>
          {products.length ? (
            <StockForm products={products} />
          ) : (
            <p className="text-sm text-[#748078]">Cadastre produtos para movimentar o estoque.</p>
          )}
        </div>
      </section>

      <section className="card mt-4 overflow-hidden">
        <div className="p-5">
          <h2 className="section-title">Saldo atual por produto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Disponível</th>
                <th>Mínimo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {products.length ? (
                products.map((product) => (
                  <tr key={product.id} className="group hover:bg-[#f7f9f7]/50">
                    <td className="font-semibold">{product.name}</td>
                    <td>
                      <span className={`font-semibold ${product.stock <= product.minStock ? "text-red-600" : "text-[#15803d]"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.minStock}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: product.stock <= product.minStock ? "#fef2f2" : "#edf6f1", color: product.stock <= product.minStock ? "#b91c1c" : "#176b4c" }}>
                        {product.stock <= product.minStock ? "Estoque baixo" : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#748078] text-sm">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-4 overflow-hidden">
        <div className="p-5 border-b border-[#e5ebe6]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Últimas movimentações</h2>
              <p className="mt-1 text-xs text-[#748078]">Histórico de entradas e saídas</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {movements.length ? (
                movements.map((movement) => (
                  <tr key={movement.id} className="group hover:bg-[#f7f9f7]/50">
                    <td>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(movement.createdAt)}
                    </td>
                    <td className="font-semibold">{movement.product.name}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: movement.type === "PURCHASE" ? "#edf6f1" : "#fef2f2", color: movement.type === "PURCHASE" ? "#176b4c" : "#b91c1c" }}>
                        {movement.type === "PURCHASE" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="font-semibold" style={{ color: movement.type === "PURCHASE" ? "#176b4c" : "#b91c1c" }}>
                      {movement.type === "PURCHASE" ? `+${movement.quantity}` : `-${movement.quantity}`}
                    </td>
                    <td>{movement.note ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#748078] text-sm">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
