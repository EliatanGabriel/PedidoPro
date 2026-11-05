import { Search } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { money } from "@/lib/format";
import { ProductForm } from "@/components/product-form";
import { AccessDenied } from "@/components/access-denied";
import { ProductRowActions } from "@/components/product-row-actions";
import { CategoryForm } from "@/components/category-form";
import { CategoryManager } from "@/components/category-manager";

export default async function ProductsPage() {
  const context = await getTenantContext();
  if (!context) return null;
  if (!can(context, "view_products")) return <AccessDenied />;
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: context.company.id, isActive: true },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: { companyId: context.company.id },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const canManage = can(context, "manage_products");
  const lowStock = products.filter((p) => p.stock <= p.minStock).length;
  const totalValue = products.reduce((sum, p) => sum + p.priceCents * p.stock, 0);
  return (
    <div className="content">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">Organize preços, categorias e disponibilidade.</p>
        </div>
        {canManage && (
          <Link className="button inline-flex items-center gap-2" href="/painel/produtos/novo">
            Novo produto <Search size={15} />
          </Link>
        )}
      </div>

      {canManage && (
        <>
          <section className="card mt-5 p-5">
            <h2 className="section-title mb-4">Adicionar produto</h2>
            <ProductForm categories={categories} />
          </section>
          <section className="card mt-4 p-5">
            <h2 className="section-title mb-4">Categorias</h2>
            <CategoryForm />
            <div className="mt-4"><CategoryManager initial={categories} /></div>
          </section>
        </>
      )}

      <section className="card mt-5 overflow-hidden">
        <div className="p-5 border-b border-[#e5ebe6]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Seu catálogo</h2>
              <p className="text-xs text-[#748078]">
                {products.length} produto{products.length !== 1 ? "s" : ""} · {lowStock > 0 ? `${lowStock} com estoque baixo` : "Sem alertas de estoque"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#177a56]">{money(totalValue)}</p>
              <p className="text-[10px] text-[#748078]">Valor em estoque</p>
            </div>
          </div>
        </div>
        {products.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Situação</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="group hover:bg-[#f7f9f7]/50">
                    <td className="font-semibold">{product.name}</td>
                    <td>{product.category?.name ?? "—"}</td>
                    <td>{money(product.priceCents)}</td>
                    <td>
                      <span className={`font-semibold ${product.stock <= product.minStock ? "text-red-600" : "text-[#15803d]"}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.minStock}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: product.stock <= product.minStock ? "#fef2f2" : "#edf6f1", color: product.stock <= product.minStock ? "#b91c1c" : "#176b4c" }}>
                        {product.stock <= product.minStock ? "Estoque baixo" : "Disponível"}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <ProductRowActions product={product} categories={categories} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty p-12">
            <p className="text-xs text-[#748078]">Nenhum produto cadastrado.</p>
            {canManage && (
              <Link className="button mt-4" href="/painel/produtos/novo">
                Cadastrar primeiro produto
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
