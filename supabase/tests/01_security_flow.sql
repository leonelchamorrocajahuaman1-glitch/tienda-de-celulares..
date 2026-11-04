-- Pruebas de seguridad y flujo de compra (PostgreSQL local con 00_supabase_stub.sql)
-- Ejecutar: psql -v ON_ERROR_STOP=1 -f supabase/tests/01_security_flow.sql
\set QUIET on
\pset tuples_only on
set client_min_messages = warning;

-- Usuarios de prueba
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-4111-a111-111111111111', 'cliente@test.pe', '{"full_name":"Ana Cliente","role":"admin"}'),
  ('22222222-2222-4222-a222-222222222222', 'otro@test.pe', '{"full_name":"Otro Cliente"}'),
  ('33333333-3333-4333-a333-333333333333', 'admin@test.pe', '{"full_name":"Admin"}')
on conflict do nothing;
update public.profiles set role = 'admin' where id = '33333333-3333-4333-a333-333333333333';

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FALLO: %', label; end if;
  raise notice 'OK: %', label;
end $$;
set client_min_messages = notice;

-- 1) El rol enviado en metadatos se ignora
select pg_temp.check((select role from public.profiles where id = '11111111-1111-4111-a111-111111111111') = 'customer',
  'registro ignora rol enviado por el navegador');

-- 2) Un cliente no puede escalar privilegios
select pg_temp.as_user('11111111-1111-4111-a111-111111111111');
do $$ begin
  update public.profiles set role = 'admin' where id = auth.uid();
  raise exception 'FALLO: cliente pudo cambiar su rol';
exception when insufficient_privilege then raise notice 'OK: cliente no puede volverse admin';
end $$;

-- 3) El cliente no puede modificar precios ni stock
do $$ declare n int; begin
  update public.product_variants set price = 1 where true;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLO: cliente modificó precios'; end if;
  raise notice 'OK: cliente no modifica precios (0 filas)';
end $$;
do $$ begin
  update public.inventory set stock = 999;
  raise exception 'FALLO: cliente modificó stock';
exception when insufficient_privilege then raise notice 'OK: cliente no modifica inventario';
end $$;

-- 4) El cliente no puede insertar pedidos directamente
do $$ begin
  insert into public.orders (user_id, subtotal, total, shipping_method, payment_method, customer_name, customer_email)
  values (auth.uid(), 1, 1, 'pickup', 'cash_on_pickup', 'x', 'x');
  raise exception 'FALLO: insert directo de pedido';
exception when insufficient_privilege then raise notice 'OK: pedidos solo vía create_order()';
end $$;

-- 5) Crear dirección y pedido con precios calculados en servidor
insert into public.addresses (user_id, recipient, phone, department, province, district, line1)
values (auth.uid(), 'Ana Cliente', '999888777', 'Lima', 'Lima', 'Miraflores', 'Av. Larco 123');

select pg_temp.check((public.validate_coupon('NEXWELCOME',
  (select jsonb_agg(jsonb_build_object('variant_id', id, 'quantity', 1)) from public.product_variants where sku like 'IPHONE-17-PRO-MAX%' and storage_gb = 256 limit 1)) ->> 'valid')::boolean,
  'cupón válido');

create temp table t_order as
select public.create_order(
  (select jsonb_agg(jsonb_build_object('variant_id', v.id, 'quantity', 2, 'price', 0.01))
     from (select id from public.product_variants where sku like 'IPHONE-17-PRO-MAX-NARANJA%' and storage_gb = 256) v),
  'standard',
  (select id from public.addresses where user_id = auth.uid() limit 1),
  'mercadopago', 'NEXWELCOME') as id;
grant select on t_order to public;

select pg_temp.check((select subtotal from public.orders where id = (select id from t_order)) = 12598,
  'subtotal calculado con precio real de BD (ignora precio enviado)');
select pg_temp.check((select discount from public.orders where id = (select id from t_order)) = 300,
  'descuento con tope max_discount');
select pg_temp.check((select total from public.orders where id = (select id from t_order)) = 12298,
  'total = subtotal - descuento + envío gratis');

-- 6) Stock insuficiente
do $$ begin
  perform public.create_order(
    (select jsonb_agg(jsonb_build_object('variant_id', id, 'quantity', 10)) from public.product_variants where sku like 'HUAWEI-NOVA%'),
    'pickup', null, 'cash_on_pickup');
  raise exception 'FALLO: permitió comprar sin stock';
exception when invalid_parameter_value then raise notice 'OK: bloquea compra sin stock';
end $$;

-- 7) El cliente no puede confirmar su propio pago
do $$ begin
  perform public.confirm_order_payment((select id from t_order), 'mercadopago', 'fake', 99999, true);
  raise exception 'FALLO: cliente confirmó pago';
exception when insufficient_privilege then raise notice 'OK: cliente no puede confirmar pagos';
end $$;

-- 8) Otro cliente no ve el pedido
reset role;
select pg_temp.as_user('22222222-2222-4222-a222-222222222222');
select pg_temp.check((select count(*) from public.orders) = 0, 'otro cliente no ve pedidos ajenos');
select pg_temp.check((select count(*) from public.addresses) = 0, 'otro cliente no ve direcciones ajenas');
select pg_temp.check((select count(*) from public.coupons) = 0, 'clientes no listan cupones');

-- 9) Webhook (service_role) confirma el pago con monto menor => requiere revisión
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
set role service_role;
create temp table t_stock_before as
  select i.variant_id, i.stock from public.inventory i join public.order_items oi on oi.variant_id = i.variant_id
  where oi.order_id = (select id from t_order);
grant select on t_stock_before to public;

-- Pago exacto => pagado, stock descontado, comprobante generado
select pg_temp.check((public.confirm_order_payment((select id from t_order), 'mercadopago', 'MP-123', 12298, true) ->> 'status') = 'paid',
  'service_role confirma pago aprobado');
select pg_temp.check((select stock from public.inventory i where i.variant_id = (select variant_id from t_stock_before))
  = (select stock - 2 from t_stock_before), 'inventario descontado');
select pg_temp.check((select receipt_number from public.orders where id = (select id from t_order)) like 'B001-%', 'comprobante generado');
select pg_temp.check((public.confirm_order_payment((select id from t_order), 'mercadopago', 'MP-123', 12298, true) ->> 'already_processed')::boolean,
  'confirmación idempotente');
select pg_temp.check((select stock from public.inventory i where i.variant_id = (select variant_id from t_stock_before))
  = (select stock - 2 from t_stock_before), 'stock no se descuenta dos veces');
select pg_temp.check((select used_count from public.coupons where code = 'NEXWELCOME') = 1, 'uso de cupón contabilizado');

-- 10) Admin: ve todo, ajusta inventario, cancela con reposición
reset role;
select pg_temp.as_user('33333333-3333-4333-a333-333333333333');
select pg_temp.check((select count(*) from public.orders) >= 1, 'admin ve todos los pedidos');
select pg_temp.check(public.admin_adjust_inventory((select variant_id from t_stock_before), 5, 'restock', 'Ingreso') =
  (select stock + 3 from t_stock_before), 'admin repone stock');
select public.admin_update_order_status((select id from t_order), 'cancelled', 'Prueba');
select pg_temp.check((select stock from public.inventory i where i.variant_id = (select variant_id from t_stock_before))
  = (select stock + 5 from t_stock_before), 'cancelación repone stock');
select pg_temp.check((select count(*) from public.admin_sales_summary(now() - interval '1 day', now() + interval '1 day')) = 0,
  'reportes excluyen pedidos cancelados');

-- 11) Anónimo
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
set role anon;
select pg_temp.check((select count(*) from public.products) = 20, 'anónimo ve catálogo');
select pg_temp.check((select count(*) from public.orders) = 0, 'anónimo no ve pedidos');
do $$ begin
  perform public.create_order('[]'::jsonb, 'pickup', null, 'cash_on_pickup');
  raise exception 'FALLO: anónimo creó pedido';
exception when insufficient_privilege then raise notice 'OK: anónimo no puede crear pedidos';
end $$;
reset role;
\echo 'TODAS LAS PRUEBAS PASARON'
