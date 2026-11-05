"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { couponSchema, money, productSchema, slug, uuid } from "@/lib/admin-schemas";
import { requireAdmin } from "@/lib/auth";

/**
 * Acciones del panel. Cada una:
 *  1) verifica el rol admin en el servidor (requireAdmin → profiles.role),
 *  2) valida la entrada con zod,
 *  3) se ejecuta con la sesión del admin, por lo que RLS/is_admin() vuelve a autorizar en la BD.
 */
export interface Result<T = unknown> {
  ok?: boolean;
  error?: string;
  data?: T;
}

function catalogChanged(productSlug?: string) {
  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/catalogo");
  if (productSlug) revalidatePath(`/producto/${productSlug}`);
}

function dbError(e: { message: string; code?: string } | null, fallback: string) {
  if (!e) return fallback;
  if (e.code === "23505") return "Ya existe un registro con ese valor único (slug, SKU o código).";
  if (e.code === "22023" || e.code === "42501") return e.message;
  return fallback;
}

// ---------------------------------------------------------------- Productos
export async function saveProductAction(input: unknown): Promise<Result<{ id: string }>> {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { variants, id, ...p } = parsed.data;
  const active = variants.filter((v) => v.is_active);
  const cheapest = [...(active.length ? active : variants)].sort((a, b) => a.price - b.price)[0];
  const row = {
    ...p,
    ram_gb: cheapest.ram_gb,
    storage_gb: cheapest.storage_gb,
    base_price: cheapest.price,
    compare_at_price: cheapest.compare_at_price,
  };

  let productId = id;
  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId);
    if (error) return { error: dbError(error, "No se pudo actualizar el producto") };
  } else {
    const { data, error } = await supabase.from("products").insert(row).select("id").single();
    if (error || !data) return { error: dbError(error, "No se pudo crear el producto") };
    productId = data.id;
  }

  // Sincronizar variantes
  const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const removed = (existing ?? []).filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  if (removed.length) {
    // Las variantes con ventas se desactivan (preserva el historial); las demás se eliminan
    const { data: sold } = await supabase.from("order_items").select("variant_id").in("variant_id", removed);
    const soldIds = new Set((sold ?? []).map((s) => s.variant_id));
    const toDelete = removed.filter((r) => !soldIds.has(r));
    if (toDelete.length) await supabase.from("product_variants").delete().in("id", toDelete);
    if (soldIds.size) await supabase.from("product_variants").update({ is_active: false }).in("id", [...soldIds]);
  }

  let position = 0;
  for (const v of variants) {
    const { initial_stock, cost_price, id: vid, ...vr } = v;
    const values = { ...vr, sku: vr.sku.toUpperCase(), product_id: productId, position: position++ };
    let variantId = vid;
    if (variantId) {
      const { error } = await supabase.from("product_variants").update(values).eq("id", variantId).eq("product_id", productId);
      if (error) return { error: dbError(error, `No se pudo guardar la variante ${v.sku}`) };
    } else {
      const { data, error } = await supabase.from("product_variants").insert(values).select("id").single();
      if (error || !data) return { error: dbError(error, `No se pudo crear la variante ${v.sku}`) };
      variantId = data.id;
      if (initial_stock && initial_stock > 0) {
        const { error: invErr } = await supabase.rpc("admin_adjust_inventory", {
          p_variant_id: variantId,
          p_delta: initial_stock,
          p_reason: "initial",
          p_note: "Stock inicial",
          p_threshold: null,
        });
        if (invErr) return { error: dbError(invErr, "No se pudo registrar el stock inicial") };
      }
    }
    if (cost_price != null) {
      await supabase.from("variant_costs").upsert({ variant_id: variantId, cost_price, updated_at: new Date().toISOString() });
    } else {
      await supabase.from("variant_costs").delete().eq("variant_id", variantId);
    }
  }

  catalogChanged(p.slug);
  revalidatePath("/admin/productos");
  return { ok: true, data: { id: productId! } };
}

export async function deleteProductAction(id: string): Promise<Result<{ deactivated: boolean }>> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success) return { error: "ID inválido" };
  const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
  if ((count ?? 0) > 0) {
    // Con ventas: no se borra para preservar pedidos y comprobantes
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", id);
    if (error) return { error: "No se pudo desactivar" };
    catalogChanged();
    return { ok: true, data: { deactivated: true } };
  }
  const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
  const paths = (imgs ?? []).map((i) => i.storage_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("product-images").remove(paths);
  const { data: prod } = await supabase.from("products").select("model_url").eq("id", id).single();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar el producto" };
  if (prod?.model_url?.includes("/product-models/")) {
    const folder = prod.model_url.split("/product-models/")[1]?.split("/").slice(0, -1).join("/");
    if (folder) {
      const { data: files } = await supabase.storage.from("product-models").list(folder);
      if (files?.length) await supabase.storage.from("product-models").remove(files.map((f) => `${folder}/${f.name}`));
    }
  }
  catalogChanged();
  revalidatePath("/admin/productos");
  return { ok: true, data: { deactivated: false } };
}

// ---------------------------------------------------------------- Imágenes y 3D
const imageRowSchema = z.object({
  product_id: uuid,
  url: z.string().url().max(1000),
  storage_path: z.string().max(500),
  alt: z.string().trim().max(200),
  color_name: z.string().trim().max(40).nullable(),
});

function isOwnStorageUrl(url: string, bucket: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(base) && url.startsWith(`${base}/storage/v1/object/public/${bucket}/`);
}

export async function addImagesAction(rows: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z.array(imageRowSchema).min(1).max(20).safeParse(rows);
  if (!parsed.success) return { error: "Datos de imagen inválidos" };
  if (!parsed.data.every((r) => isOwnStorageUrl(r.url, "product-images"))) return { error: "URL de imagen no permitida" };
  const productId = parsed.data[0].product_id;
  const { data: last } = await supabase.from("product_images").select("position").eq("product_id", productId).order("position", { ascending: false }).limit(1);
  let pos = (last?.[0]?.position ?? -1) + 1;
  const { error } = await supabase.from("product_images").insert(parsed.data.map((r) => ({ ...r, position: pos++ })));
  if (error) return { error: "No se pudieron registrar las imágenes" };
  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  catalogChanged(prod?.slug);
  return { ok: true };
}

export async function updateImageAction(id: string, patch: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ alt: z.string().trim().max(200).optional(), color_name: z.string().trim().max(40).nullable().optional(), position: z.number().int().min(0).max(999).optional() })
    .safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) return { error: "Datos inválidos" };
  const { error } = await supabase.from("product_images").update(parsed.data).eq("id", id);
  if (error) return { error: "No se pudo actualizar" };
  catalogChanged();
  return { ok: true };
}

export async function deleteImageAction(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success) return { error: "ID inválido" };
  const { data: img } = await supabase.from("product_images").select("storage_path").eq("id", id).single();
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar" };
  if (img?.storage_path) await supabase.storage.from("product-images").remove([img.storage_path]);
  catalogChanged();
  return { ok: true };
}

export async function setModelAction(productId: string, url: string | null): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(productId).success) return { error: "ID inválido" };
  if (url !== null && !(isOwnStorageUrl(url, "product-models") && /\.(glb|gltf)$/i.test(url))) return { error: "URL de modelo no permitida" };
  const { data, error } = await supabase.from("products").update({ model_url: url }).eq("id", productId).select("slug").single();
  if (error) return { error: "No se pudo guardar el modelo 3D" };
  catalogChanged(data?.slug);
  return { ok: true };
}

// ---------------------------------------------------------------- Inventario
export async function adjustInventoryAction(input: unknown): Promise<Result<{ stock: number }>> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({
      variant_id: uuid,
      delta: z.coerce.number().int().min(-100000).max(100000),
      reason: z.enum(["restock", "adjustment", "return", "initial"]),
      note: z.string().trim().max(300).optional(),
      threshold: z.coerce.number().int().min(0).max(10000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const { data, error } = await supabase.rpc("admin_adjust_inventory", {
    p_variant_id: d.variant_id,
    p_delta: d.delta,
    p_reason: d.reason,
    p_note: d.note ?? null,
    p_threshold: d.threshold ?? null,
  });
  if (error) return { error: dbError(error, "No se pudo ajustar el inventario") };
  catalogChanged();
  revalidatePath("/admin/inventario");
  return { ok: true, data: { stock: data as number } };
}

// ---------------------------------------------------------------- Pedidos
export async function updateOrderStatusAction(input: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({
      order_id: uuid,
      status: z.enum(["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "refunded", "requires_attention"]),
      note: z.string().trim().max(300).optional(),
      tracking: z.string().trim().max(80).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: d.order_id,
    p_status: d.status,
    p_note: d.note || null,
    p_tracking: d.tracking || null,
  });
  if (error) return { error: dbError(error, "No se pudo actualizar el pedido") };
  catalogChanged();
  revalidatePath(`/admin/pedidos/${d.order_id}`);
  revalidatePath("/admin/pedidos");
  return { ok: true };
}

export async function confirmManualPaymentAction(orderId: string, reference: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(orderId).success) return { error: "ID inválido" };
  const ref = z.string().trim().min(3).max(80).safeParse(reference);
  if (!ref.success) return { error: "Ingresa la referencia de la operación (mín. 3 caracteres)" };
  const { error } = await supabase.rpc("admin_confirm_manual_payment", { p_order_id: orderId, p_reference: ref.data });
  if (error) return { error: dbError(error, "No se pudo confirmar el pago") };
  catalogChanged();
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

export async function saveAdminNotesAction(orderId: string, notes: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(orderId).success) return { error: "ID inválido" };
  const { error } = await supabase
    .from("order_internal_notes")
    .upsert({ order_id: orderId, notes: notes.slice(0, 4000), updated_at: new Date().toISOString() });
  if (error) return { error: "No se pudo guardar" };
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

// ---------------------------------------------------------------- Clientes
export async function updateCustomerAction(id: string, patch: unknown): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const parsed = z.object({ is_active: z.boolean().optional(), role: z.enum(["customer", "admin"]).optional() }).safeParse(patch);
  if (!uuid.safeParse(id).success || !parsed.success) return { error: "Datos inválidos" };
  if (id === user.id) return { error: "No puedes modificar tu propia cuenta desde aquí" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", id);
  if (error) return { error: dbError(error, "No se pudo actualizar el cliente") };
  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ---------------------------------------------------------------- Promociones
export async function createCouponAction(input: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("coupons").insert(parsed.data);
  if (error) return { error: dbError(error, "No se pudo crear el cupón") };
  revalidatePath("/admin/promociones");
  return { ok: true };
}

export async function toggleCouponAction(id: string, active: boolean): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success) return { error: "ID inválido" };
  const { error } = await supabase.from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return { error: "No se pudo actualizar" };
  revalidatePath("/admin/promociones");
  return { ok: true };
}

export async function deleteCouponAction(id: string): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(id).success) return { error: "ID inválido" };
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { error: "No se pudo eliminar (puede estar asociado a pedidos; desactívalo)" };
  revalidatePath("/admin/promociones");
  return { ok: true };
}

/** Aplica o retira una oferta porcentual sobre todas las variantes de un producto. */
export async function setOfferAction(productId: string, percent: number): Promise<Result> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(productId).success) return { error: "ID inválido" };
  const pct = z.coerce.number().min(0).max(80).safeParse(percent);
  if (!pct.success) return { error: "Porcentaje entre 0 y 80" };
  const { data: variants } = await supabase.from("product_variants").select("id, price, compare_at_price").eq("product_id", productId);
  for (const v of variants ?? []) {
    const original = Number(v.compare_at_price ?? v.price);
    const update =
      pct.data === 0
        ? { price: original, compare_at_price: null }
        : { price: Math.round(original * (1 - pct.data / 100)), compare_at_price: original };
    const { error } = await supabase.from("product_variants").update(update).eq("id", v.id);
    if (error) return { error: "No se pudo aplicar la oferta" };
  }
  const { data: all } = await supabase.from("product_variants").select("price, compare_at_price").eq("product_id", productId).order("price").limit(1);
  const { data: prod } = await supabase
    .from("products")
    .update({ base_price: all?.[0]?.price, compare_at_price: all?.[0]?.compare_at_price ?? null })
    .eq("id", productId)
    .select("slug")
    .single();
  catalogChanged(prod?.slug);
  revalidatePath("/admin/promociones");
  return { ok: true };
}

// ---------------------------------------------------------------- Configuración
export async function saveSettingsAction(input: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({
      store_name: z.string().trim().min(2).max(60),
      legal_name: z.string().trim().min(2).max(120),
      ruc: z.string().trim().regex(/^(\d{11})?$/, "RUC de 11 dígitos"),
      email: z.string().trim().email(),
      phone: z.string().trim().max(30),
      whatsapp: z.string().trim().max(30),
      address: z.string().trim().max(200),
      business_hours: z.string().trim().max(120),
      shipping_standard: money,
      shipping_express: money,
      free_shipping_from: money,
      bank_details: z.string().trim().max(1000),
      announcement: z.string().trim().max(160),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await supabase.from("store_settings").update(parsed.data).eq("id", 1);
  if (error) return { error: "No se pudo guardar la configuración" };
  revalidateTag("settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createBrandAction(input: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ name: z.string().trim().min(1).max(60), slug, description: z.string().trim().max(200).optional() }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { count } = await supabase.from("brands").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("brands").insert({ ...parsed.data, position: count ?? 0 });
  if (error) return { error: dbError(error, "No se pudo crear la marca") };
  catalogChanged();
  revalidatePath("/admin/configuracion");
  return { ok: true };
}

export async function createCategoryAction(input: unknown): Promise<Result> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ name: z.string().trim().min(1).max(60), slug, description: z.string().trim().max(200).optional() }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("categories").insert({ ...parsed.data, position: count ?? 0 });
  if (error) return { error: dbError(error, "No se pudo crear la categoría") };
  catalogChanged();
  revalidatePath("/admin/configuracion");
  return { ok: true };
}
