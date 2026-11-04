/**
 * Genera supabase/seed.sql a partir de lib/catalog-data.ts
 * Uso: npm run db:seed:generate
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_BRANDS, SEED_CATEGORIES, SEED_PRODUCTS } from "../lib/catalog-data";
import { seedProducts } from "../lib/seed-catalog";
import { stableId } from "../lib/utils";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const out: string[] = [
  "-- Generado por scripts/generate-seed.ts — no editar a mano.",
  "-- Datos iniciales del catálogo NEXPHONE.",
  "begin;",
];

SEED_BRANDS.forEach((b, i) =>
  out.push(
    `insert into public.brands (id, name, slug, description, position) values (${q(stableId(`brand:${b.slug}`))}, ${q(b.name)}, ${q(b.slug)}, ${q(b.description)}, ${i}) on conflict (slug) do nothing;`,
  ),
);
SEED_CATEGORIES.forEach((c, i) =>
  out.push(
    `insert into public.categories (id, name, slug, description, position) values (${q(stableId(`category:${c.slug}`))}, ${q(c.name)}, ${q(c.slug)}, ${q(c.description)}, ${i}) on conflict (slug) do nothing;`,
  ),
);

for (const p of seedProducts) {
  const src = SEED_PRODUCTS.find((s) => s.slug === p.slug)!;
  out.push(`\n-- ${p.name}`);
  out.push(
    `insert into public.products (id, slug, name, brand_id, category_id, model, tagline, description, processor, ram_gb, storage_gb, display, camera, battery, os, extra_specs, base_price, compare_at_price, model_preset, is_featured, is_new, is_bestseller, sold_count, release_date) values (` +
      [
        q(p.id), q(p.slug), q(p.name), q(p.brand.id), q(p.category?.id ?? null), q(p.model), q(p.tagline),
        q(p.description), q(p.processor), p.ram_gb, p.storage_gb, q(p.display), q(p.camera), q(p.battery), q(p.os),
        `${q(JSON.stringify(p.extra_specs))}::jsonb`, p.base_price, q(p.compare_at_price), q(p.model_preset),
        p.is_featured, p.is_new, p.is_bestseller, p.sold_count, q(src.releaseDate),
      ].join(", ") +
      `) on conflict (slug) do nothing;`,
  );
  for (const v of p.variants) {
    out.push(
      `insert into public.product_variants (id, product_id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_default, position) values (${[
        q(v.id), q(p.id), q(v.sku), q(v.color_name), q(v.color_hex), v.ram_gb, v.storage_gb, v.price,
        q(v.compare_at_price), v.is_default, v.position,
      ].join(", ")}) on conflict (sku) do nothing;`,
    );
    if (v.stock > 0) {
      out.push(
        `update public.inventory set stock = ${v.stock} where variant_id = ${q(v.id)} and stock = 0 and not exists (select 1 from public.inventory_movements m where m.variant_id = ${q(v.id)});`,
        `insert into public.inventory_movements (variant_id, delta, stock_after, reason, note) select ${q(v.id)}, ${v.stock}, ${v.stock}, 'initial', 'Stock inicial' where not exists (select 1 from public.inventory_movements m where m.variant_id = ${q(v.id)});`,
      );
    }
  }
  for (const im of p.images) {
    out.push(
      `insert into public.product_images (id, product_id, color_name, url, alt, position) values (${[
        q(im.id), q(p.id), q(im.color_name), q(im.url), q(im.alt), im.position,
      ].join(", ")}) on conflict (id) do nothing;`,
    );
  }
}

out.push(
  "\n-- Cupones de ejemplo",
  `insert into public.coupons (code, description, type, value, min_subtotal, max_discount, max_uses) values ('NEXWELCOME', 'Bienvenida: 5% de descuento', 'percent', 5, 500, 300, 1000) on conflict (code) do nothing;`,
  `insert into public.coupons (code, description, type, value, min_subtotal) values ('FUTURE100', 'S/ 100 de descuento en compras desde S/ 2,500', 'fixed', 100, 2500) on conflict (code) do nothing;`,
  "commit;",
);

writeFileSync(join(__dirname, "..", "supabase", "seed.sql"), out.join("\n") + "\n");
console.log(`seed.sql generado: ${seedProducts.length} productos`);
