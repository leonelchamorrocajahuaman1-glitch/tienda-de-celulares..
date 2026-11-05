/** Variante del seed compacto que referencia productos por slug (IDs generados por la BD). */
import { writeFileSync } from "node:fs";
import { SEED_PRODUCTS, RENDER_VIEWS, slugify } from "../lib/catalog-data";

const rows = SEED_PRODUCTS.map((p) => [p.slug, p.colors.map((c) => [c.name, c.hex]), p.configs.map((k) => [k.ram, k.storage, k.price, k.compare ?? null]), p.stock]);
const json = JSON.stringify(rows).replace(/'/g, "''");
const sql = `-- Variantes (color × configuración), costo 80%, stock inicial con historial e imágenes por color
create temp table _p on commit drop as
select e.value ->> 0 as slug, e.value -> 1 as colors, e.value -> 2 as configs, (e.value ->> 3)::int as stock
from jsonb_array_elements('${json}'::jsonb) e;
create temp table _v on commit drop as
select pr.id as product_id, p.slug,
  upper(left(p.slug || '-' || trim(both '-' from regexp_replace(lower(translate(c.value ->> 0, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')), '[^a-z0-9]+', '-', 'g')) || '-' || (k.value ->> 0) || '-' || (k.value ->> 1), 60)) as sku,
  c.value ->> 0 as color_name, c.value ->> 1 as color_hex, (k.value ->> 0)::int as ram_gb, (k.value ->> 1)::int as storage_gb,
  (k.value ->> 2)::numeric as price, nullif(k.value ->> 3, '')::numeric as compare_at_price,
  (c.ordinality = 1 and (k.value ->> 2)::numeric = (select min((x ->> 2)::numeric) from jsonb_array_elements(p.configs) x)) as is_default,
  ((c.ordinality - 1) * jsonb_array_length(p.configs) + k.ordinality - 1)::int as position,
  case when p.stock = 0 then 0 else greatest(0, p.stock - (c.ordinality::int - 1) * 2 - (k.ordinality::int - 1) * 3) end as stock
from _p p
join public.products pr on pr.slug = p.slug
cross join lateral jsonb_array_elements(p.colors) with ordinality c
cross join lateral jsonb_array_elements(p.configs) with ordinality k;
insert into public.product_variants (product_id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_default, position)
select product_id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price, is_default, position from _v
on conflict (sku) do nothing;
insert into public.variant_costs (variant_id, cost_price)
select pv.id, round(v.price * 0.8) from _v v join public.product_variants pv on pv.sku = v.sku
on conflict (variant_id) do nothing;
with upd as (
  update public.inventory i set stock = v.stock
  from _v v join public.product_variants pv on pv.sku = v.sku
  where i.variant_id = pv.id and v.stock > 0 and i.stock = 0
    and not exists (select 1 from public.inventory_movements m where m.variant_id = pv.id)
  returning i.variant_id, i.stock)
insert into public.inventory_movements (variant_id, delta, stock_after, reason, note)
select variant_id, stock, stock, 'initial', 'Stock inicial' from upd;
insert into public.product_images (product_id, color_name, url, alt, position)
select pr.id, c.value ->> 0,
  '/products/' || p.slug || '/' || trim(both '-' from regexp_replace(lower(translate(c.value ->> 0, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')), '[^a-z0-9]+', '-', 'g')) || '-' || vw.view || '.webp',
  pr.name || ' ' || (c.value ->> 0) || ' — ' || case vw.view when 'front' then 'vista frontal' when 'back' then 'vista posterior' else 'vista lateral' end,
  ((c.ordinality - 1) * 3 + vw.ord - 1)::int
from _p p join public.products pr on pr.slug = p.slug
cross join lateral jsonb_array_elements(p.colors) with ordinality c
cross join (values ${RENDER_VIEWS.map((v, i) => `('${v}', ${i + 1})`).join(", ")}) vw(view, ord)
where not exists (select 1 from public.product_images im where im.product_id = pr.id);
insert into public.coupons (code, description, type, value, min_subtotal, max_discount, max_uses)
values ('NEXWELCOME', 'Bienvenida: 5% de descuento', 'percent', 5, 500, 300, 1000) on conflict (code) do nothing;
insert into public.coupons (code, description, type, value, min_subtotal)
values ('FUTURE100', 'S/ 100 de descuento en compras desde S/ 2,500', 'fixed', 100, 2500) on conflict (code) do nothing;
`;
writeFileSync(process.argv[2], sql);
console.log(sql.length, "bytes;", slugify("Púrpura Lavanda"));
