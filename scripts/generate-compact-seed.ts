/**
 * Genera el catálogo inicial en partes compactas (JSON → SQL) para aplicarlo por API/MCP.
 * Equivalente a supabase/seed.sql e idempotente (on conflict do nothing; stock solo si no hay movimientos).
 * Uso: npx tsx scripts/generate-compact-seed.ts <directorio-salida>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_BRANDS, SEED_CATEGORIES } from "../lib/catalog-data";
import { seedProducts } from "../lib/seed-catalog";
import { stableId } from "../lib/utils";

const out = process.argv[2] ?? "supabase/seed-parts";
mkdirSync(out, { recursive: true });
const lit = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

const brands = SEED_BRANDS.map((b, i) => ({ id: stableId(`brand:${b.slug}`), name: b.name, slug: b.slug, description: b.description, position: i }));
const cats = SEED_CATEGORIES.map((c, i) => ({ id: stableId(`category:${c.slug}`), name: c.name, slug: c.slug, description: c.description, position: i }));
const prods = seedProducts.map((p) => ({
  id: p.id, slug: p.slug, name: p.name, brand_id: p.brand.id, category_id: p.category?.id ?? null, model: p.model, tagline: p.tagline,
  description: p.description, processor: p.processor, ram_gb: p.ram_gb, storage_gb: p.storage_gb, display: p.display, camera: p.camera,
  battery: p.battery, os: p.os, extra_specs: p.extra_specs, base_price: p.base_price, compare_at_price: p.compare_at_price,
  model_preset: p.model_preset, is_featured: p.is_featured, is_new: p.is_new, is_bestseller: p.is_bestseller, sold_count: p.sold_count,
  release_date: p.release_date,
}));

writeFileSync(join(out, "01_catalog.sql"), `-- Marcas, categorías y productos
insert into public.brands (id, name, slug, description, position)
select * from jsonb_to_recordset(${lit(brands)}) as x(id uuid, name text, slug text, description text, position int)
on conflict (slug) do nothing;
insert into public.categories (id, name, slug, description, position)
select * from jsonb_to_recordset(${lit(cats)}) as x(id uuid, name text, slug text, description text, position int)
on conflict (slug) do nothing;
insert into public.products (id, slug, name, brand_id, category_id, model, tagline, description, processor, ram_gb, storage_gb, display, camera, battery, os, extra_specs, base_price, compare_at_price, model_preset, is_featured, is_new, is_bestseller, sold_count, release_date)
select * from jsonb_to_recordset(${lit(prods)}) as x(id uuid, slug text, name text, brand_id uuid, category_id uuid, model text, tagline text, description text, processor text, ram_gb int, storage_gb int, display text, camera text, battery text, os text, extra_specs jsonb, base_price numeric, compare_at_price numeric, model_preset text, is_featured boolean, is_new boolean, is_bestseller boolean, sold_count int, release_date date)
on conflict (slug) do nothing;
`);

const vars = seedProducts.flatMap((p) => p.variants.map((v) => ({
  id: v.id, product_id: p.id, sku: v.sku, color_name: v.color_name, color_hex: v.color_hex, ram_gb: v.ram_gb, storage_gb: v.storage_gb,
  price: v.price, compare_at_price: v.compare_at_price, is_default: v.is_default, position: v.position, stock: v.stock, cost: Math.round(v.price * 0.8),
})));
writeFileSync(join(out, "02_variants.sql"), `-- Variantes, costos y stock inicial (con historial)
with v as (select * from jsonb_to_recordset(${lit(vars)}) as x(id uuid, product_id uuid, sku text, color_name text, color_hex text, ram_gb int, storage_gb int, price numeric, compare_at_price numeric, is_default boolean, position int, stock int, cost numeric))
, ins as (
  insert into public.product_variants (id, product_id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_default, position)
  select id, product_id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_default, position from v
  on conflict (sku) do nothing returning id
)
select count(*) from ins;
insert into public.variant_costs (variant_id, cost_price)
select x.id, x.cost from jsonb_to_recordset(${lit(vars.map(({ id, cost }) => ({ id, cost })))}) as x(id uuid, cost numeric)
where exists (select 1 from public.product_variants pv where pv.id = x.id)
on conflict (variant_id) do nothing;
with s as (select * from jsonb_to_recordset(${lit(vars.filter((v) => v.stock > 0).map(({ id, stock }) => ({ id, stock })))}) as x(id uuid, stock int)),
fresh as (select s.* from s where not exists (select 1 from public.inventory_movements m where m.variant_id = s.id)),
upd as (update public.inventory i set stock = f.stock from fresh f where i.variant_id = f.id and i.stock = 0 returning i.variant_id, i.stock)
insert into public.inventory_movements (variant_id, delta, stock_after, reason, note)
select variant_id, stock, stock, 'initial', 'Stock inicial' from upd;
`);

const imgs = seedProducts.flatMap((p) => p.images.map((im) => ({ id: im.id, product_id: p.id, color_name: im.color_name, url: im.url, alt: im.alt, position: im.position })));
writeFileSync(join(out, "03_images.sql"), `-- Imágenes de producto
insert into public.product_images (id, product_id, color_name, url, alt, position)
select * from jsonb_to_recordset(${lit(imgs)}) as x(id uuid, product_id uuid, color_name text, url text, alt text, position int)
on conflict (id) do nothing;
insert into public.coupons (code, description, type, value, min_subtotal, max_discount, max_uses)
values ('NEXWELCOME', 'Bienvenida: 5% de descuento', 'percent', 5, 500, 300, 1000) on conflict (code) do nothing;
insert into public.coupons (code, description, type, value, min_subtotal)
values ('FUTURE100', 'S/ 100 de descuento en compras desde S/ 2,500', 'fixed', 100, 2500) on conflict (code) do nothing;
`);
console.log("ok");
