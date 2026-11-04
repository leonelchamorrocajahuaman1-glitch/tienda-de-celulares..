import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { mapProduct, PRODUCT_SELECT } from "@/lib/data/catalog";
import { formatPEN } from "@/lib/format";

export const metadata = { title: "Productos" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });
  if (sp.estado === "activos") query = query.eq("is_active", true);
  if (sp.estado === "inactivos") query = query.eq("is_active", false);
  const { data } = await query;
  const q = (sp.q ?? "").toLowerCase().trim();
  const products = (data ?? []).map((r) => mapProduct(r as Record<string, unknown>)).filter((p) => !q || `${p.name} ${p.brand.name} ${p.model}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle={`${products.length} productos`}
        actions={
          <Link href="/admin/productos/nuevo" className="btn btn-primary">
            <Plus className="h-4 w-4" /> Nuevo producto
          </Link>
        }
      />
      <Panel>
        <form className="mb-4 flex flex-wrap gap-3">
          <input name="q" defaultValue={sp.q} placeholder="Buscar por nombre, marca o modelo" className="input max-w-sm" />
          <select name="estado" defaultValue={sp.estado ?? ""} className="input !w-auto">
            <option value="">Todos</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
        {products.length === 0 ? (
          <Empty>No hay productos.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Variantes</th>
                <th>Precio desde</th>
                <th>Stock</th>
                <th>3D</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                const img = p.images[0]?.url;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3 hover:text-cyan-200">
                        <span className="relative h-12 w-10 shrink-0 rounded-lg bg-white/[0.04]">
                          {img && <Image src={img} alt="" fill sizes="40px" className="object-contain p-0.5" />}
                        </span>
                        <span>
                          <span className="block font-medium">{p.name}</span>
                          <span className="text-xs text-zinc-500">{p.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{p.brand.name}</td>
                    <td>{p.variants.length}</td>
                    <td className="font-mono">{formatPEN(Math.min(...p.variants.map((v) => v.price), p.base_price))}</td>
                    <td className={stock === 0 ? "text-rose-300" : stock < 10 ? "text-amber-300" : ""}>{stock}</td>
                    <td className="text-xs">{p.model_url ? "GLB" : "Procedural"}</td>
                    <td>
                      <span className={p.is_active ? "text-emerald-300" : "text-zinc-500"}>{p.is_active ? "Activo" : "Inactivo"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
