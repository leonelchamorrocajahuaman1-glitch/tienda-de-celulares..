-- Variantes (color × configuración), costo 80%, stock inicial con historial e imágenes por color
begin;
create temp table _p on commit drop as
select e.value ->> 0 as slug, e.value -> 1 as colors, e.value -> 2 as configs, (e.value ->> 3)::int as stock
from jsonb_array_elements('[["iphone-17-pro-max",[["Naranja Cósmico","#c8642f"],["Azul Profundo","#2f3c55"],["Plata","#d9dadc"]],[[12,256,6299,6699],[12,512,7299,null],[12,1024,8299,null]],12],["iphone-17",[["Lavanda","#b7a9d6"],["Salvia","#a9b89a"],["Negro","#1d1d1f"]],[[8,256,4299,null],[8,512,5199,null]],20],["iphone-16e",[["Blanco","#ecebe8"],["Negro","#1f2023"]],[[8,128,2799,2999],[8,256,3299,null]],18],["galaxy-s25-ultra",[["Titanio Plata Azul","#8fa3b8"],["Titanio Negro","#2b2c2e"],["Titanio Gris","#8a8a86"]],[[12,256,5499,5999],[12,512,6199,6699]],14],["galaxy-z-fold7",[["Azul Sombra","#2c3a52"],["Plata Sombra","#b9bcc2"]],[[12,512,8299,null]],6],["galaxy-a56",[["Grafito","#3a3b3f"],["Rosa","#e4c3c9"],["Oliva","#9aa184"]],[[8,128,1499,1699],[8,256,1699,1899]],30],["xiaomi-15-ultra",[["Plata Cromo","#c9c7c2"],["Negro","#16171a"]],[[16,512,5299,5799]],8],["redmi-note-14-pro-plus",[["Negro Medianoche","#1b1c20"],["Púrpura Lavanda","#9b8fc9"]],[[8,256,1399,1599],[12,512,1699,1899]],25],["motorola-edge-60-pro",[["Pantone Shadow","#2f3133"],["Pantone Dazzling Blue","#2b4a8b"],["Pantone Sparkling Grape","#5b3a5e"]],[[12,512,2199,2499]],15],["moto-g85",[["Azul Cobalto","#2e4f8f"],["Gris Urbano","#6d6f72"]],[[8,256,999,1199]],40],["honor-magic7-pro",[["Gris Luna","#9fa3a8"],["Negro","#141518"]],[[12,512,4299,4799]],9],["honor-400",[["Gris Meteorito","#5b5e63"],["Plata Desierto","#d6d0c4"]],[[12,256,1899,2099]],16],["huawei-pura-80-pro",[["Negro Esmaltado","#121214"],["Dorado Arena","#c8b48e"]],[[12,512,4999,null]],5],["huawei-nova-13-pro",[["Verde","#7f9c8a"],["Negro","#1a1b1e"]],[[12,512,2299,2699]],0],["pixel-10-pro",[["Obsidiana","#202124"],["Porcelana","#e8e2d8"],["Musgo","#6f7a5f"]],[[16,256,4799,null],[16,512,5399,null]],10],["pixel-9a",[["Iris","#8a8fc4"],["Obsidiana","#222326"]],[[8,128,1999,2199]],3],["oneplus-13",[["Azul Medianoche","#1f2a44"],["Blanco Perla","#ece9e2"]],[[12,256,3899,4199],[16,512,4399,4799]],11],["oneplus-nord-5",[["Gris Seco","#7a7d80"],["Hielo Marino","#a7c4cf"]],[[12,256,1899,null]],14],["realme-gt-7-pro",[["Gris Marte","#6b6e73"],["Azul Galaxia","#25427a"]],[[12,256,2999,3399]],7],["realme-14-pro-plus",[["Gris Perla","#c7c6c3"],["Púrpura Suede","#6c5a86"]],[[12,512,1799,2099]],19]]'::jsonb) e;
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
cross join (values ('back', 1), ('front', 2), ('side', 3)) vw(view, ord)
where not exists (select 1 from public.product_images im where im.product_id = pr.id);
insert into public.coupons (code, description, type, value, min_subtotal, max_discount, max_uses)
values ('NEXWELCOME', 'Bienvenida: 5% de descuento', 'percent', 5, 500, 300, 1000) on conflict (code) do nothing;
insert into public.coupons (code, description, type, value, min_subtotal)
values ('FUTURE100', 'S/ 100 de descuento en compras desde S/ 2,500', 'fixed', 100, 2500) on conflict (code) do nothing;
commit;
