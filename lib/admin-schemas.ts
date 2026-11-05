import { z } from "zod";

/** Esquemas de validación del panel administrativo (usados por app/admin/actions.ts y pruebas). */
export const uuid = z.string().uuid();
export const money = z.coerce.number({ error: "Monto inválido" }).min(0, "Ingresa precios válidos (no negativos)").max(1_000_000, "Monto demasiado alto").transform((n) => Math.round(n * 100) / 100);
export const optMoney = z.union([z.null(), z.literal(""), money]).transform((v) => (v === "" || v === null ? null : v));
export const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug inválido (minúsculas, números y guiones)");

export const variantSchema = z.object({
  id: uuid.optional(),
  sku: z.string().trim().min(3).max(60).regex(/^[A-Za-z0-9-_]+$/, "SKU inválido"),
  color_name: z.string().trim().min(1, "Color requerido").max(40),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color HEX inválido"),
  ram_gb: z.coerce.number().int().min(1).max(64),
  storage_gb: z.coerce.number().int().min(8).max(4096),
  price: money,
  compare_at_price: optMoney,
  cost_price: optMoney,
  is_default: z.boolean(),
  is_active: z.boolean(),
  initial_stock: z.coerce.number().int().min(0).max(100000).optional(),
});

export const productSchema = z
  .object({
    id: uuid.optional(),
    slug,
    name: z.string().trim().min(2).max(120),
    brand_id: uuid,
    category_id: uuid.nullable(),
    model: z.string().trim().min(1).max(80),
    tagline: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(5000),
    processor: z.string().trim().max(120),
    display: z.string().trim().max(160),
    camera: z.string().trim().max(200),
    battery: z.string().trim().max(160),
    os: z.string().trim().max(80),
    extra_specs: z.record(z.string().trim().min(1).max(60), z.string().trim().max(200)).refine((o) => Object.keys(o).length <= 30),
    model_preset: z.enum(["square", "vertical", "circle", "bar"]),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    is_new: z.boolean(),
    is_bestseller: z.boolean(),
    release_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    variants: z.array(variantSchema).min(1, "Agrega al menos una variante").max(60),
  })
  .refine((p) => p.variants.filter((v) => v.is_default).length <= 1, { message: "Solo una variante puede ser la predeterminada" })
  .refine((p) => new Set(p.variants.map((v) => v.sku.toUpperCase())).size === p.variants.length, { message: "Los SKU deben ser únicos" })
  .refine((p) => p.variants.every((v) => v.compare_at_price == null || v.compare_at_price > v.price), {
    message: "El precio anterior debe ser mayor que el precio actual",
  });

export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "Código: 3–30 caracteres (A-Z, 0-9, - _)"),
    description: z.string().trim().max(200).optional(),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive().max(100000),
    min_subtotal: z.coerce.number().min(0).max(1_000_000).default(0),
    max_discount: z.union([z.coerce.number().positive(), z.literal("")]).optional().transform((v) => (v === "" || v == null ? null : v)),
    max_uses: z.union([z.coerce.number().int().positive(), z.literal("")]).optional().transform((v) => (v === "" || v == null ? null : v)),
    // datetime-local llega sin zona horaria: se interpreta como hora de Lima (UTC−5)
    starts_at: z.string().optional().transform((v) => (v ? new Date(v.length === 16 ? `${v}:00-05:00` : v).toISOString() : null)),
    ends_at: z.string().optional().transform((v) => (v ? new Date(v.length === 16 ? `${v}:00-05:00` : v).toISOString() : null)),
  })
  .refine((c) => c.type !== "percent" || c.value <= 90, { message: "El porcentaje máximo es 90%" })
  .refine((c) => !c.starts_at || !c.ends_at || c.ends_at > c.starts_at, { message: "La fecha de fin debe ser posterior al inicio" });
