import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaManager } from "@/components/admin/MediaManager";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { mapProduct, PRODUCT_SELECT } from "@/lib/data/catalog";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: row }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    supabase.from("brands").select("id, name").order("position"),
    supabase.from("categories").select("id, name").order("position"),
  ]);
  if (!row) notFound();
  const p = mapProduct(row as Record<string, unknown>);
  const { data: costs } = await supabase.from("variant_costs").select("variant_id, cost_price").in("variant_id", p.variants.map((v) => v.id));
  const costMap = new Map((costs ?? []).map((c) => [c.variant_id, Number(c.cost_price)]));
  const brandId = (row as unknown as { brand: { id: string } }).brand.id;

  return (
    <>
      <Link href="/admin/productos" className="text-sm text-zinc-400 hover:text-white">← Productos</Link>
      <PageHeader
        title={p.name}
        subtitle={`${p.brand.name} · ${p.variants.length} variantes`}
        actions={
          <Link href={`/producto/${p.slug}`} target="_blank" className="btn btn-ghost">
            Ver en tienda <ExternalLink className="h-4 w-4" />
          </Link>
        }
      />
      <div className="space-y-6">
        <MediaManager
          productId={p.id}
          productName={p.name}
          colors={[...new Set(p.variants.map((v) => v.color_name))]}
          images={p.images}
          modelUrl={p.model_url}
          previewColor={p.variants.find((v) => v.is_default)?.color_hex ?? p.variants[0]?.color_hex ?? "#888888"}
        />
        <ProductEditor
          brands={brands ?? []}
          categories={categories ?? []}
          initial={{
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand_id: brandId,
            category_id: p.category?.id ?? null,
            model: p.model,
            tagline: p.tagline ?? "",
            description: p.description,
            processor: p.processor,
            display: p.display,
            camera: p.camera,
            battery: p.battery,
            os: p.os,
            extra_specs: p.extra_specs,
            model_preset: p.model_preset,
            is_active: p.is_active,
            is_featured: p.is_featured,
            is_new: p.is_new,
            is_bestseller: p.is_bestseller,
            release_date: p.release_date,
            variants: p.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              color_name: v.color_name,
              color_hex: v.color_hex,
              ram_gb: v.ram_gb,
              storage_gb: v.storage_gb,
              price: v.price,
              compare_at_price: v.compare_at_price ?? "",
              cost_price: costMap.get(v.id) ?? "",
              is_default: v.is_default,
              is_active: v.is_active,
              stock: v.stock,
            })),
          }}
        />
      </div>
    </>
  );
}
