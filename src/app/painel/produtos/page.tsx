import { prisma } from "@/lib/prisma";
import { can, getTenantContext } from "@/lib/tenant";
import { money } from "@/lib/format";
import { ProductForm } from "@/components/product-form";
import { AccessDenied } from "@/components/access-denied";
import { ProductRowActions } from "@/components/product-row-actions";
import { CategoryForm } from "@/components/category-form";
import { CategoryManager } from "@/components/category-manager";

export default async function ProductsPage() {
  const context = await getTenantContext(); if (!context) return null; if (!can(context, "view_products")) return <AccessDenied />;
  const [products,categories]=await Promise.all([prisma.product.findMany({where:{companyId:context.company.id,isActive:true},include:{category:{select:{name:true}}},orderBy:{createdAt:"desc"}}),prisma.category.findMany({where:{companyId:context.company.id},include:{_count:{select:{products:true}}},orderBy:{name:"asc"}})]);
  const canManage=can(context,"manage_products");
  return <div className="content"><p className="eyebrow">Catálogo</p><h1 className="page-title">Produtos</h1><p className="page-subtitle">Organize preços, categorias e disponibilidade.</p>{canManage&&<><section className="card mt-6 p-5"><h2 className="section-title mb-5">Adicionar produto</h2><ProductForm categories={categories}/></section><section className="card mt-5 p-5"><h2 className="section-title mb-4">Categorias</h2><CategoryForm/><div className="mt-4"><CategoryManager initial={categories}/></div></section></>}<section className="card mt-5 overflow-hidden"><div className="p-5"><h2 className="section-title">Seu catálogo <span className="ml-2 text-xs font-normal text-[#849087]">{products.length} ativos</span></h2></div>{products.length ? <div className="overflow-x-auto"><table className="table"><thead><tr><th>Produto</th><th>Categoria</th><th>SKU</th><th>Preço</th><th>Estoque</th><th>Disponibilidade</th>{canManage&&<th>Ações</th>}</tr></thead><tbody>{products.map((product)=><tr key={product.id}><td className="font-semibold">{product.name}</td><td>{product.category?.name??"—"}</td><td>{product.sku || "—"}</td><td>{money(product.priceCents)}</td><td>{product.stock}</td><td><span className="badge">{product.stock <= product.minStock ? "Estoque baixo" : "Disponível"}</span></td>{canManage&&<td><ProductRowActions product={product} categories={categories}/></td>}</tr>)}</tbody></table></div>:<div className="empty">Nenhum produto cadastrado. Adicione o primeiro pelo formulário acima.</div>}</section></div>;
}
