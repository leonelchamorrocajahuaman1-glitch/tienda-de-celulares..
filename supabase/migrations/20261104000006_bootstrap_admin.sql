-- =====================================================================
-- NEXPHONE — Primer administrador automático (sin SQL manual)
-- Se promueve a admin la cuenta cuyo correo coincide con la variable de servidor ADMIN_EMAIL,
-- SOLO si: (1) aún no existe ningún administrador activo y (2) el correo está confirmado.
-- Únicamente ejecutable por service_role (servidor) o por el propietario de la BD.
-- =====================================================================
create or replace function public.bootstrap_first_admin(p_email text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_confirmed boolean;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_email is null or btrim(p_email) = '' then
    return 'sin_email';
  end if;
  -- Bloqueo para evitar dos promociones simultáneas
  perform pg_advisory_xact_lock(hashtext('nexphone_bootstrap_admin'));
  if exists (select 1 from public.profiles where role = 'admin' and is_active) then
    return 'ya_existe_admin';
  end if;
  select u.id, (u.email_confirmed_at is not null) into v_id, v_confirmed
  from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_id is null then
    return 'usuario_no_registrado';
  end if;
  if not v_confirmed then
    return 'correo_sin_confirmar';
  end if;
  update public.profiles set role = 'admin', is_active = true where id = v_id;
  return 'promovido';
end $$;

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;

-- Comprobación de salud del esquema (usada por /api/health y el panel). Solo lectura, sin datos sensibles.
create or replace function public.nexphone_schema_status()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'tables', (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (
      'profiles','brands','categories','products','product_variants','product_images','inventory','inventory_movements',
      'addresses','carts','cart_items','coupons','orders','order_items','order_internal_notes','order_status_history',
      'payments','store_settings','variant_costs')),
    'tables_expected', 19,
    'rls_disabled', (select coalesce(jsonb_agg(c.relname), '[]'::jsonb) from pg_class c join pg_namespace n on n.oid = c.relnamespace
                     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
    'functions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (
      'is_admin','create_order','confirm_order_payment','record_payment_event','validate_coupon','admin_adjust_inventory',
      'admin_update_order_status','admin_confirm_manual_payment','admin_sales_summary','admin_top_products',
      'admin_profit_summary','admin_customers','cancel_my_order','bootstrap_first_admin')),
    'functions_expected', 14,
    'buckets', (select coalesce(jsonb_agg(id order by id), '[]'::jsonb) from storage.buckets where id in ('product-images','product-models')),
    'products', (select count(*) from public.products),
    'admins', (select count(*) from public.profiles where role = 'admin' and is_active)
  );
$$;
revoke all on function public.nexphone_schema_status() from public, anon, authenticated;
grant execute on function public.nexphone_schema_status() to service_role;
