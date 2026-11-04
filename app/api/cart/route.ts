import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatStorage } from "@/lib/format";

/** Carrito persistido para usuarios autenticados (RLS: cada usuario solo accede al suyo). */

const putSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .max(30),
});

async function ctx() {
  const sb = await getServerSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return { sb, user };
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ items: [] }, { status: 401 });
  const { data, error } = await c.sb
    .from("carts")
    .select(
      `items:cart_items(quantity, variant:product_variants(id, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_active,
        inventory(stock), product:products(id, slug, name, is_active, brand:brands(name), images:product_images(url, color_name, position))))`,
    )
    .eq("user_id", c.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "No se pudo cargar el carrito" }, { status: 500 });

  type Img = { url: string; color_name: string | null; position: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data?.items as any[]) ?? []).filter((r) => r.variant?.is_active && r.variant?.product?.is_active);
  const items = rows.map((r) => {
    const v = r.variant;
    const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
    const imgs: Img[] = [...(v.product.images ?? [])].sort((a: Img, b: Img) => a.position - b.position);
    const img = imgs.find((i) => i.color_name === v.color_name) ?? imgs[0];
    return {
      variantId: v.id,
      productId: v.product.id,
      slug: v.product.slug,
      name: v.product.name,
      brand: v.product.brand?.name ?? "",
      variantLabel: `${v.color_name} · ${v.ram_gb} GB RAM · ${formatStorage(v.storage_gb)}`,
      colorHex: v.color_hex,
      image: img?.url ?? null,
      unitPrice: Number(v.price),
      compareAt: v.compare_at_price == null ? null : Number(v.compare_at_price),
      quantity: r.quantity,
      maxStock: Number(inv?.stock ?? 0),
    };
  });
  return NextResponse.json({ items });
}

export async function PUT(req: Request) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { data: cart, error } = await c.sb
    .from("carts")
    .upsert({ user_id: c.user.id }, { onConflict: "user_id" })
    .select("id")
    .single();
  if (error || !cart) return NextResponse.json({ error: "No se pudo guardar el carrito" }, { status: 500 });

  await c.sb.from("cart_items").delete().eq("cart_id", cart.id);
  const merged = new Map<string, number>();
  parsed.data.items.forEach((i) => merged.set(i.variantId, Math.min(10, (merged.get(i.variantId) ?? 0) + i.quantity)));
  if (merged.size) {
    const { error: insErr } = await c.sb
      .from("cart_items")
      .insert([...merged].map(([variant_id, quantity]) => ({ cart_id: cart.id, variant_id, quantity })));
    if (insErr) return NextResponse.json({ error: "Producto no válido en el carrito" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
