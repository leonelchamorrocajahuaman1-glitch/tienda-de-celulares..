-- =====================================================================
-- NEXPHONE — Roles, perfiles y Row Level Security
-- =====================================================================

-- ¿El usuario autenticado es administrador? (la fuente de verdad es la BD, nunca el navegador)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Perfil automático al registrarse. El rol SIEMPRE es 'customer':
-- se ignora cualquier rol enviado en los metadatos del registro.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 30)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario se otorgue el rol de administrador o se reactive.
-- Las conexiones directas del propietario (SQL Editor, sin JWT) y service_role sí pueden.
create or replace function public.protect_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email)
     and coalesce(auth.role(), '') in ('anon', 'authenticated')  -- peticiones vía API
     and not public.is_admin() then
    raise exception 'No autorizado para modificar privilegios' using errcode = '42501';
  end if;
  -- Un administrador no puede quitarse a sí mismo el rol (evita quedarse sin admins)
  if old.id = auth.uid() and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'No puedes quitarte tu propio rol de administrador' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Inventario automático para cada variante nueva
create or replace function public.create_inventory_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory (variant_id, stock) values (new.id, 0) on conflict do nothing;
  return new;
end $$;
drop trigger if exists variants_inventory on public.product_variants;
create trigger variants_inventory after insert on public.product_variants
  for each row execute function public.create_inventory_row();

-- Una sola dirección por defecto por usuario
create or replace function public.single_default_address() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;
drop trigger if exists addresses_single_default on public.addresses;
create trigger addresses_single_default after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.single_default_address();

-- ---------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.brands                enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.product_variants      enable row level security;
alter table public.product_images        enable row level security;
alter table public.inventory             enable row level security;
alter table public.inventory_movements   enable row level security;
alter table public.addresses             enable row level security;
alter table public.carts                 enable row level security;
alter table public.cart_items            enable row level security;
alter table public.coupons               enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.payments              enable row level security;
alter table public.store_settings        enable row level security;

-- ---------- profiles ----------
create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: actualizar el propio" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- catálogo: lectura pública, escritura solo admin ----------
create policy "brands: lectura pública" on public.brands for select using (true);
create policy "brands: admin" on public.brands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "categories: lectura pública" on public.categories for select using (true);
create policy "categories: admin" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products: lectura de activos" on public.products for select
  using (is_active or public.is_admin());
create policy "products: admin" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "variants: lectura de activas" on public.product_variants for select
  using ((is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
         or public.is_admin());
create policy "variants: admin" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "images: lectura pública" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));
create policy "images: admin" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- El stock es visible (disponibilidad), pero SOLO se modifica mediante funciones seguras.
create policy "inventory: lectura pública" on public.inventory for select using (true);

create policy "movements: admin lee" on public.inventory_movements for select to authenticated
  using (public.is_admin());

-- ---------- datos del cliente ----------
create policy "addresses: dueño" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: admin lee" on public.addresses for select to authenticated
  using (public.is_admin());

create policy "carts: dueño" on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items: dueño" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Pedidos: el cliente solo LEE los suyos. Se crean exclusivamente vía create_order().
create policy "orders: dueño lee" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin actualiza" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "order_items: dueño lee" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "order_history: dueño lee" on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

create policy "payments: dueño lee" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- Cupones: solo admin los lista; los clientes los validan con validate_coupon().
create policy "coupons: admin" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "settings: lectura pública" on public.store_settings for select using (true);
create policy "settings: admin actualiza" on public.store_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Defensa en profundidad: el cliente nunca escribe directamente en estas tablas.
revoke insert, update, delete on public.orders, public.order_items, public.payments,
  public.order_status_history, public.inventory, public.inventory_movements from anon;
revoke insert, delete on public.orders, public.order_items, public.payments,
  public.order_status_history, public.inventory_movements from authenticated;
revoke update, delete on public.payments, public.inventory_movements, public.order_status_history from authenticated;
revoke insert, update, delete on public.inventory from authenticated;
revoke insert, delete on public.profiles from anon, authenticated;
