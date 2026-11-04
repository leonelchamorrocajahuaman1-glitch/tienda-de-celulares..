import Link from "next/link";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id, name").order("position"),
    supabase.from("categories").select("id, name").order("position"),
  ]);
  return (
    <>
      <Link href="/admin/productos" className="text-sm text-zinc-400 hover:text-white">← Productos</Link>
      <PageHeader title="Nuevo producto" subtitle="Después de crearlo podrás subir fotografías y el modelo 3D." />
      <ProductEditor
        brands={brands ?? []}
        categories={categories ?? []}
        initial={{
          slug: "",
          name: "",
          brand_id: brands?.[0]?.id ?? "",
          category_id: null,
          model: "",
          tagline: "",
          description: "",
          processor: "",
          display: "",
          camera: "",
          battery: "",
          os: "",
          extra_specs: {},
          model_preset: "square",
          is_active: true,
          is_featured: false,
          is_new: true,
          is_bestseller: false,
          release_date: null,
          variants: [
            { sku: "", color_name: "Negro", color_hex: "#1d1d1f", ram_gb: 8, storage_gb: 256, price: "", compare_at_price: "", cost_price: "", is_default: true, is_active: true, initial_stock: 0 },
          ],
        }}
      />
    </>
  );
}
