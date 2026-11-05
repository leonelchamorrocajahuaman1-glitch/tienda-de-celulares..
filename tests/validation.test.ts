/** Validaciones del panel y del checkout. Ejecutar: npx tsx tests/validation.test.ts */
import { couponSchema, productSchema } from "../lib/admin-schemas";
import { safeNext } from "../lib/safe-redirect";

let failed = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

const base = {
  slug: "nuevo-telefono",
  name: "Nuevo Teléfono",
  brand_id: "8f0e7c32-1d1e-4b7a-9a0e-2b5f3c1d4e5f",
  category_id: null,
  model: "X1",
  tagline: null,
  description: "",
  processor: "",
  display: "",
  camera: "",
  battery: "",
  os: "",
  extra_specs: { Resistencia: "IP68" },
  model_preset: "square",
  is_active: true,
  is_featured: false,
  is_new: true,
  is_bestseller: false,
  release_date: null,
};
const variant = { sku: "NUEVO-NEGRO-8-256", color_name: "Negro", color_hex: "#111111", ram_gb: 8, storage_gb: 256, price: 1999, compare_at_price: null, cost_price: null, is_default: true, is_active: true, initial_stock: 5 };

const ok1 = productSchema.safeParse({ ...base, variants: [variant] });
check(ok1.success && ok1.data.variants[0].compare_at_price === null, "Producto sin oferta: precio anterior vacío se guarda como null");
check(productSchema.safeParse({ ...base, variants: [{ ...variant, compare_at_price: "" }] }).success, "Precio anterior '' aceptado");
check(!productSchema.safeParse({ ...base, variants: [{ ...variant, compare_at_price: 1500 }] }).success, "Precio anterior menor al precio: rechazado");
check(productSchema.safeParse({ ...base, variants: [{ ...variant, compare_at_price: 2299 }] }).success, "Oferta válida aceptada");
check(!productSchema.safeParse({ ...base, variants: [{ ...variant, price: -1 }] }).success, "Precio negativo rechazado");
check(!productSchema.safeParse({ ...base, variants: [variant, { ...variant }] }).success, "SKU duplicado rechazado");
check(!productSchema.safeParse({ ...base, variants: [variant, { ...variant, sku: "OTRO-1" }] }).success, "Dos variantes predeterminadas rechazadas");
check(!productSchema.safeParse({ ...base, slug: "Mal Slug!", variants: [variant] }).success && productSchema.safeParse({ ...base, slug: "MAYUS-ok", variants: [variant] }).success, "Slug: símbolos rechazados, mayúsculas normalizadas");
check(!productSchema.safeParse({ ...base, variants: [{ ...variant, color_hex: "rojo" }] }).success, "Color HEX inválido rechazado");
check(!productSchema.safeParse({ ...base, variants: Array.from({ length: 61 }, (_, i) => ({ ...variant, sku: `S-${i}`, is_default: false })) }).success, "Más de 60 variantes rechazado");

const c = couponSchema.safeParse({ code: "verano10", type: "percent", value: "10", min_subtotal: "0", max_discount: "", max_uses: "", starts_at: "2026-12-01T00:00", ends_at: "" });
check(c.success && c.data.code === "VERANO10" && c.data.max_discount === null && c.data.ends_at === null, "Cupón: normaliza código y campos vacíos");
check(c.success && c.data.starts_at === "2026-12-01T05:00:00.000Z", "Cupón: fecha interpretada en hora de Lima (UTC−5)");
check(!couponSchema.safeParse({ code: "MUCHO", type: "percent", value: "95" }).success, "Cupón: porcentaje > 90 rechazado");

check(safeNext("/cuenta/pedidos") === "/cuenta/pedidos", "Redirección interna permitida");
check(safeNext("//evil.com") === "/cuenta" && safeNext("https://evil.com") === "/cuenta" && safeNext("/\\evil.com") === "/cuenta", "Redirecciones abiertas bloqueadas");

process.exit(failed ? 1 : 0);
