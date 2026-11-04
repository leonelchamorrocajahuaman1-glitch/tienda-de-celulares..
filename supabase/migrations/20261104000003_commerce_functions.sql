-- =====================================================================
-- NEXPHONE — Lógica de negocio segura (precios, stock, pedidos, pagos)
-- Todos los importes se calculan en el servidor a partir de la BD.
-- =====================================================================

-- ---------- Cupones ----------
create or replace function public.coupon_discount(p_code text, p_subtotal numeric)
returns table (coupon_id uuid, code text, discount numeric, message text)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  d numeric;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select null::uuid, null::text, 0::numeric, 'Sin cupón'::text; return;
  end if;
  select cp.* into c from public.coupons cp where cp.code = btrim(p_code)::citext;
  if not found or not c.is_active then
    return query select null::uuid, null::text, 0::numeric, 'Cupón no válido'::text; return;
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    return query select null::uuid, null::text, 0::numeric, 'El cupón aún no está vigente'::text; return;
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    return query select null::uuid, null::text, 0::numeric, 'El cupón ha expirado'::text; return;
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return query select null::uuid, null::text, 0::numeric, 'El cupón alcanzó su límite de usos'::text; return;
  end if;
  if p_subtotal < c.min_subtotal then
    return query select null::uuid, null::text, 0::numeric,
      ('Compra mínima de S/ ' || to_char(c.min_subtotal, 'FM999G999D00'))::text; return;
  end if;
  if c.type = 'percent' then
    d := round(p_subtotal * c.value / 100, 2);
  else
    d := c.value;
  end if;
  if c.max_discount is not null then d := least(d, c.max_discount); end if;
  d := least(d, p_subtotal);
  return query select c.id, c.code::text, d, 'Cupón aplicado'::text;
end $$;

-- Endpoint público para validar un cupón contra un carrito (precios desde la BD)
create or replace function public.validate_coupon(p_code text, p_items jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_subtotal numeric := 0;
  r record;
begin
  select coalesce(sum(v.price * least(greatest((i ->> 'quantity')::int, 1), 10)), 0) into v_subtotal
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) i
  join public.product_variants v on v.id = (i ->> 'variant_id')::uuid and v.is_active
  join public.products p on p.id = v.product_id and p.is_active;

  select * into r from public.coupon_discount(p_code, v_subtotal);
  return jsonb_build_object('valid', r.coupon_id is not null, 'code', r.code,
    'discount', r.discount, 'subtotal', v_subtotal, 'message', r.message);
end $$;

-- ---------- Crear pedido ----------
-- p_items: [{"variant_id": "...", "quantity": 1}, ...]
create or replace function public.create_order(
  p_items           jsonb,
  p_shipping_method public.shipping_method,
  p_address_id      uuid,
  p_payment_method  public.payment_method,
  p_coupon_code     text default null,
  p_receipt_type    text default 'boleta',
  p_document_type   text default null,
  p_document_number text default null,
  p_notes           text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles%rowtype;
  v_settings  public.store_settings%rowtype;
  v_address   public.addresses%rowtype;
  v_order_id  uuid;
  v_subtotal  numeric := 0;
  v_discount  numeric := 0;
  v_shipping  numeric := 0;
  v_coupon    record;
  v_coupon_id uuid;
  v_coupon_code text;
  v_count     int;
  it          record;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para comprar' using errcode = '42501';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or not v_profile.is_active then
    raise exception 'Cuenta no habilitada' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Demasiados productos en el pedido' using errcode = '22023';
  end if;

  if p_receipt_type not in ('boleta', 'factura') then
    raise exception 'Tipo de comprobante inválido' using errcode = '22023';
  end if;
  if p_receipt_type = 'factura' and (p_document_number is null or p_document_number !~ '^(10|20)[0-9]{9}$') then
    raise exception 'Para factura se requiere un RUC válido (11 dígitos)' using errcode = '22023';
  end if;
  if p_document_type is not null and p_document_type not in ('DNI', 'CE', 'RUC', 'PASAPORTE') then
    raise exception 'Tipo de documento inválido' using errcode = '22023';
  end if;
  if p_document_number is not null and p_document_number !~ '^[A-Za-z0-9]{6,15}$' then
    raise exception 'Número de documento inválido' using errcode = '22023';
  end if;

  if p_shipping_method = 'pickup' then
    v_address := null;
  else
    select * into v_address from public.addresses where id = p_address_id and user_id = v_uid;
    if not found then
      raise exception 'Selecciona una dirección de entrega válida' using errcode = '22023';
    end if;
  end if;
  if p_payment_method = 'cash_on_pickup' and p_shipping_method <> 'pickup' then
    raise exception 'El pago en tienda solo está disponible con recojo en tienda' using errcode = '22023';
  end if;

  -- Consolidar items y validar contra la BD (precio y stock reales)
  drop table if exists pg_temp._items;
  create temporary table _items on commit drop as
  select (i ->> 'variant_id')::uuid as variant_id, sum((i ->> 'quantity')::int)::int as quantity
  from jsonb_array_elements(p_items) i
  group by 1;

  if exists (select 1 from _items where quantity < 1 or quantity > 10) then
    raise exception 'Cantidad inválida (1 a 10 unidades por producto)' using errcode = '22023';
  end if;

  select count(*) into v_count
  from _items t
  join public.product_variants v on v.id = t.variant_id and v.is_active
  join public.products p on p.id = v.product_id and p.is_active;
  if v_count <> (select count(*) from _items) then
    raise exception 'Uno o más productos ya no están disponibles' using errcode = '22023';
  end if;

  for it in
    select t.variant_id, t.quantity, coalesce(inv.stock, 0) as stock, p.name
    from _items t
    join public.product_variants v on v.id = t.variant_id
    join public.products p on p.id = v.product_id
    left join public.inventory inv on inv.variant_id = t.variant_id
  loop
    if it.stock < it.quantity then
      raise exception 'Stock insuficiente para %', it.name using errcode = '22023';
    end if;
  end loop;

  select coalesce(sum(v.price * t.quantity), 0) into v_subtotal
  from _items t join public.product_variants v on v.id = t.variant_id;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select * into v_coupon from public.coupon_discount(p_coupon_code, v_subtotal);
    if v_coupon.coupon_id is null then
      raise exception '%', v_coupon.message using errcode = '22023';
    end if;
    v_discount := v_coupon.discount;
    v_coupon_id := v_coupon.coupon_id;
    v_coupon_code := v_coupon.code;
  end if;

  select * into v_settings from public.store_settings where id = 1;
  v_shipping := case p_shipping_method
    when 'pickup'   then 0
    when 'express'  then v_settings.shipping_express
    else case when v_subtotal - v_discount >= v_settings.free_shipping_from then 0 else v_settings.shipping_standard end
  end;

  insert into public.orders (
    user_id, subtotal, discount, shipping_cost, total, coupon_id, coupon_code,
    shipping_method, shipping_address, payment_method, customer_name, customer_email,
    customer_phone, document_type, document_number, receipt_type, notes
  ) values (
    v_uid, v_subtotal, v_discount, v_shipping, greatest(v_subtotal - v_discount + v_shipping, 0),
    v_coupon_id, v_coupon_code,
    p_shipping_method,
    case when v_address.id is null then null else jsonb_build_object(
      'label', v_address.label, 'recipient', v_address.recipient, 'phone', v_address.phone,
      'department', v_address.department, 'province', v_address.province,
      'district', v_address.district, 'line1', v_address.line1, 'reference', v_address.reference) end,
    p_payment_method,
    coalesce(nullif(v_profile.full_name, ''), v_profile.email::text),
    v_profile.email::text,
    coalesce(v_address.phone, v_profile.phone),
    p_document_type, p_document_number, p_receipt_type, left(p_notes, 500)
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, variant_id, product_name, variant_label, sku, image_url, unit_price, quantity, line_total)
  select v_order_id, p.id, v.id, p.name,
         v.color_name || ' · ' || v.ram_gb || ' GB RAM · ' ||
           case when v.storage_gb >= 1024 then (v.storage_gb / 1024) || ' TB' else v.storage_gb || ' GB' end,
         v.sku,
         (select im.url from public.product_images im
            where im.product_id = p.id and (im.color_name = v.color_name or im.color_name is null)
            order by (im.color_name is null), im.position limit 1),
         v.price, t.quantity, v.price * t.quantity
  from _items t
  join public.product_variants v on v.id = t.variant_id
  join public.products p on p.id = v.product_id;

  insert into public.order_status_history (order_id, status, note, created_by)
  values (v_order_id, 'pending_payment', 'Pedido creado', v_uid);

  -- Registro del pago pendiente (no implica cobro)
  insert into public.payments (order_id, provider, status, amount, is_test)
  values (v_order_id, p_payment_method::text, 'pending',
          greatest(v_subtotal - v_discount + v_shipping, 0), true);

  -- Vaciar carrito persistido
  delete from public.cart_items where cart_id in (select id from public.carts where user_id = v_uid);

  return v_order_id;
end $$;

-- ---------- Confirmar pago (solo servidor: service_role o admin) ----------
create or replace function public.confirm_order_payment(
  p_order_id            uuid,
  p_provider            text,
  p_provider_payment_id text,
  p_amount              numeric,
  p_is_test             boolean,
  p_raw                 jsonb default null,
  p_reference           text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o         public.orders%rowtype;
  it        record;
  v_stock   int;
  v_problem text := null;
  v_receipt text;
  v_actor   uuid := auth.uid();
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = 'P0002';
  end if;

  -- Idempotencia: un pedido ya pagado no se procesa dos veces
  if o.paid_at is not null then
    return jsonb_build_object('status', o.status, 'already_processed', true, 'receipt_number', o.receipt_number);
  end if;
  if o.status = 'cancelled' then
    v_problem := 'Pago recibido para un pedido cancelado';
  end if;
  if round(p_amount, 2) < o.total then
    v_problem := coalesce(v_problem, 'Monto pagado (S/ ' || p_amount || ') menor al total del pedido');
  end if;

  -- Registrar / actualizar transacción
  update public.payments
     set provider = p_provider, provider_payment_id = p_provider_payment_id, provider_reference = p_reference,
         status = 'approved', amount = p_amount, is_test = p_is_test, raw = p_raw
   where order_id = o.id and status in ('pending', 'in_process', 'rejected')
     and (provider_payment_id is null or provider_payment_id = p_provider_payment_id);
  if not found then
    insert into public.payments (order_id, provider, provider_payment_id, provider_reference, status, amount, is_test, raw)
    values (o.id, p_provider, p_provider_payment_id, p_reference, 'approved', p_amount, p_is_test, p_raw)
    on conflict (provider, provider_payment_id) do update set status = 'approved', raw = excluded.raw;
  end if;

  if v_problem is null then
    -- Descontar inventario con bloqueo de filas (evita sobreventa concurrente)
    for it in
      select oi.variant_id, oi.quantity from public.order_items oi
      where oi.order_id = o.id and oi.variant_id is not null
      order by oi.variant_id
    loop
      select stock into v_stock from public.inventory where variant_id = it.variant_id for update;
      if v_stock is null or v_stock < it.quantity then
        v_problem := 'Stock insuficiente al confirmar el pago';
        exit;
      end if;
    end loop;
  end if;

  if v_problem is null then
    for it in
      select oi.variant_id, oi.product_id, oi.quantity from public.order_items oi
      where oi.order_id = o.id and oi.variant_id is not null
    loop
      update public.inventory set stock = stock - it.quantity
       where variant_id = it.variant_id returning stock into v_stock;
      insert into public.inventory_movements (variant_id, delta, stock_after, reason, order_id, created_by, note)
      values (it.variant_id, -it.quantity, v_stock, 'sale', o.id, v_actor, 'Venta ' || o.order_number);
      update public.products set sold_count = sold_count + it.quantity where id = it.product_id;
    end loop;

    if o.coupon_id is not null then
      update public.coupons set used_count = used_count + 1 where id = o.coupon_id;
    end if;

    v_receipt := case when o.receipt_type = 'factura' then 'F001-' else 'B001-' end
                 || lpad(nextval('public.receipt_number_seq')::text, 8, '0');

    update public.orders set status = 'paid', paid_at = now(), receipt_number = v_receipt where id = o.id;
    insert into public.order_status_history (order_id, status, note, created_by)
    values (o.id, 'paid', 'Pago confirmado (' || p_provider || coalesce(' #' || p_provider_payment_id, '') || ')', v_actor);
    return jsonb_build_object('status', 'paid', 'receipt_number', v_receipt);
  else
    update public.orders set status = 'requires_attention', paid_at = now() where id = o.id;
    insert into public.order_internal_notes (order_id, notes) values (o.id, v_problem)
    on conflict (order_id) do update
      set notes = left(concat_ws(E'\n', public.order_internal_notes.notes, excluded.notes), 4000), updated_at = now();
    insert into public.order_status_history (order_id, status, note, created_by)
    values (o.id, 'requires_attention', v_problem, v_actor);
    return jsonb_build_object('status', 'requires_attention', 'problem', v_problem);
  end if;
end $$;

-- Registrar estados no aprobados de la pasarela (rechazado, en proceso, ...)
create or replace function public.record_payment_event(
  p_order_id uuid, p_provider text, p_provider_payment_id text,
  p_status public.payment_status, p_status_detail text, p_amount numeric, p_is_test boolean, p_raw jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_status = 'approved' then
    raise exception 'Use confirm_order_payment para pagos aprobados';
  end if;
  update public.payments
     set provider_payment_id = p_provider_payment_id, status = p_status, status_detail = p_status_detail,
         amount = p_amount, is_test = p_is_test, raw = p_raw
   where order_id = p_order_id and provider = p_provider
     and (provider_payment_id is null or provider_payment_id = p_provider_payment_id)
     and status <> 'approved';
  if not found then
    insert into public.payments (order_id, provider, provider_payment_id, status, status_detail, amount, is_test, raw)
    values (p_order_id, p_provider, p_provider_payment_id, p_status, p_status_detail, p_amount, p_is_test, p_raw)
    on conflict (provider, provider_payment_id) do update
      set status = excluded.status, status_detail = excluded.status_detail, raw = excluded.raw
      where public.payments.status <> 'approved';
  end if;
end $$;

-- ---------- Cliente: cancelar su pedido pendiente ----------
create or replace function public.cancel_my_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'cancelled'
   where id = p_order_id and user_id = auth.uid() and status = 'pending_payment' and paid_at is null;
  if not found then
    raise exception 'El pedido no puede cancelarse' using errcode = '22023';
  end if;
  update public.payments set status = 'cancelled' where order_id = p_order_id and status = 'pending';
  insert into public.order_status_history (order_id, status, note, created_by)
  values (p_order_id, 'cancelled', 'Cancelado por el cliente', auth.uid());
end $$;

-- ---------- Admin: ajustar inventario ----------
create or replace function public.admin_adjust_inventory(
  p_variant_id uuid, p_delta int, p_reason text, p_note text default null, p_threshold int default null
) returns int
language plpgsql security definer set search_path = public as $$
declare v_stock int;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_reason not in ('initial', 'restock', 'adjustment', 'return') then
    raise exception 'Motivo inválido' using errcode = '22023';
  end if;
  insert into public.inventory (variant_id, stock) values (p_variant_id, 0) on conflict do nothing;
  if p_threshold is not null then
    update public.inventory set low_stock_threshold = greatest(p_threshold, 0) where variant_id = p_variant_id;
  end if;
  if coalesce(p_delta, 0) = 0 then
    select stock into v_stock from public.inventory where variant_id = p_variant_id;
    return v_stock;
  end if;
  update public.inventory set stock = stock + p_delta
   where variant_id = p_variant_id and stock + p_delta >= 0
   returning stock into v_stock;
  if not found then raise exception 'El stock no puede quedar negativo' using errcode = '22023'; end if;
  insert into public.inventory_movements (variant_id, delta, stock_after, reason, note, created_by)
  values (p_variant_id, p_delta, v_stock, p_reason, left(p_note, 300), auth.uid());
  return v_stock;
end $$;

-- ---------- Admin: actualizar estado de pedido ----------
create or replace function public.admin_update_order_status(
  p_order_id uuid, p_status public.order_status, p_note text default null, p_tracking text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  o  public.orders%rowtype;
  it record;
  v_stock int;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;

  if p_status = 'paid' and o.paid_at is null then
    raise exception 'Para marcar como pagado registra la confirmación del pago' using errcode = '22023';
  end if;
  if p_status in ('processing', 'shipped', 'delivered') and o.paid_at is null and o.payment_method <> 'cash_on_pickup' then
    raise exception 'El pedido aún no tiene un pago confirmado' using errcode = '22023';
  end if;

  -- Devolver stock si se cancela/reembolsa un pedido cuyo stock ya fue descontado
  if p_status in ('cancelled', 'refunded') and o.status in ('paid', 'processing', 'shipped', 'delivered')
     and exists (select 1 from public.inventory_movements m where m.order_id = o.id and m.reason = 'sale') then
    for it in select variant_id, product_id, quantity from public.order_items where order_id = o.id and variant_id is not null loop
      update public.inventory set stock = stock + it.quantity where variant_id = it.variant_id returning stock into v_stock;
      insert into public.inventory_movements (variant_id, delta, stock_after, reason, order_id, created_by, note)
      values (it.variant_id, it.quantity, v_stock, 'cancellation', o.id, auth.uid(), 'Reposición ' || o.order_number);
      update public.products set sold_count = greatest(sold_count - it.quantity, 0) where id = it.product_id;
    end loop;
  end if;

  update public.orders set status = p_status, tracking_code = coalesce(p_tracking, tracking_code) where id = o.id;
  if p_status = 'refunded' then
    update public.payments set status = 'refunded' where order_id = o.id and status = 'approved';
  end if;
  insert into public.order_status_history (order_id, status, note, created_by)
  values (o.id, p_status, left(p_note, 300), auth.uid());
end $$;

-- ---------- Admin: confirmar pago manual (transferencia / pago en tienda) ----------
create or replace function public.admin_confirm_manual_payment(p_order_id uuid, p_reference text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if o.payment_method = 'mercadopago' then
    raise exception 'Los pagos de Mercado Pago se confirman automáticamente con la pasarela' using errcode = '22023';
  end if;
  if p_reference is null or char_length(btrim(p_reference)) < 3 then
    raise exception 'Ingresa la referencia de la operación' using errcode = '22023';
  end if;
  return public.confirm_order_payment(o.id, o.payment_method::text, 'manual-' || o.order_number, o.total, false,
    jsonb_build_object('confirmed_by', auth.uid(), 'reference', p_reference), btrim(p_reference));
end $$;

-- ---------- Reportes (solo admin) ----------
create or replace function public.admin_sales_summary(p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns table (period date, orders bigint, units bigint, revenue numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_bucket not in ('day', 'month') then raise exception 'Agrupación inválida'; end if;
  return query
  select date_trunc(p_bucket, o.paid_at at time zone 'America/Lima')::date as period,
         count(distinct o.id),
         coalesce(sum(oi.quantity), 0)::bigint,
         coalesce(sum(oi.line_total), 0)
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.paid_at is not null and o.status not in ('cancelled', 'refunded', 'requires_attention')
    and o.paid_at >= p_from and o.paid_at < p_to
  group by 1 order by 1;
end $$;

create or replace function public.admin_top_products(p_from timestamptz, p_to timestamptz, p_limit int default 10)
returns table (product_id uuid, product_name text, units bigint, revenue numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
  select oi.product_id, max(oi.product_name), sum(oi.quantity)::bigint, sum(oi.line_total)
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.paid_at is not null and o.status not in ('cancelled', 'refunded', 'requires_attention')
    and o.paid_at >= p_from and o.paid_at < p_to
  group by oi.product_id order by 3 desc limit least(greatest(p_limit, 1), 50);
end $$;

-- ---------- Permisos de ejecución ----------
revoke all on function public.create_order(jsonb, public.shipping_method, uuid, public.payment_method, text, text, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, public.shipping_method, uuid, public.payment_method, text, text, text, text, text) to authenticated;

revoke all on function public.confirm_order_payment(uuid, text, text, numeric, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, text, numeric, boolean, jsonb, text) to service_role;

revoke all on function public.record_payment_event(uuid, text, text, public.payment_status, text, numeric, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.record_payment_event(uuid, text, text, public.payment_status, text, numeric, boolean, jsonb) to service_role;

revoke all on function public.coupon_discount(text, numeric) from public, anon, authenticated;
grant execute on function public.validate_coupon(text, jsonb) to anon, authenticated;

revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;

revoke all on function public.admin_adjust_inventory(uuid, int, text, text, int) from public, anon;
revoke all on function public.admin_update_order_status(uuid, public.order_status, text, text) from public, anon;
revoke all on function public.admin_confirm_manual_payment(uuid, text) from public, anon;
revoke all on function public.admin_sales_summary(timestamptz, timestamptz, text) from public, anon;
revoke all on function public.admin_top_products(timestamptz, timestamptz, int) from public, anon;
grant execute on function public.admin_adjust_inventory(uuid, int, text, text, int) to authenticated;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text, text) to authenticated;
grant execute on function public.admin_confirm_manual_payment(uuid, text) to authenticated;
grant execute on function public.admin_sales_summary(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_top_products(timestamptz, timestamptz, int) to authenticated;
