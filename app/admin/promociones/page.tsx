import { type CouponRow, CouponForm, CouponList, OfferManager } from "@/components/admin/Promotions";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Promociones" };

export default async function PromotionsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: coupons }, { data: products }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("products").select("id, name, base_price, compare_at_price").eq("is_active", true).order("name"),
  ]);
  return (
    <>
      <PageHeader title="Promociones" subtitle="Cupones de descuento y ofertas de productos" />
      <div className="space-y-6">
        <Panel title="Crear cupón">
          <CouponForm />
        </Panel>
        <Panel title="Cupones">
          <CouponList coupons={(coupons ?? []).map((c) => ({ ...c, value: Number(c.value), min_subtotal: Number(c.min_subtotal), max_discount: c.max_discount == null ? null : Number(c.max_discount) })) as CouponRow[]} />
        </Panel>
        <Panel title="Ofertas por producto">
          <p className="mb-4 text-xs text-zinc-500">El descuento se aplica a todas las variantes: el precio actual pasa a ser el “precio anterior” y se muestra el ahorro en la tienda.</p>
          <OfferManager products={(products ?? []).map((p) => ({ id: p.id, name: p.name, price: Number(p.base_price), compare: p.compare_at_price == null ? null : Number(p.compare_at_price) }))} />
        </Panel>
      </div>
    </>
  );
}
