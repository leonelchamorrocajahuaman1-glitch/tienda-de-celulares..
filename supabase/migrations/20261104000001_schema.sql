-- =====================================================================
-- NEXPHONE — Esquema principal
-- =====================================================================
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending_payment', 'paid', 'processing', 'shipped', 'delivered',
    'cancelled', 'refunded', 'requires_attention'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shipping_method as enum ('standard', 'express', 'pickup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('mercadopago', 'bank_transfer', 'cash_on_pickup');
exception when duplicate_object then null; end $$;

-- ---------- Utilidad updated_at ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext,
  full_name   text check (char_length(full_name) <= 120),
  phone       text check (char_length(phone) <= 30),
  document_type text check (document_type in ('DNI', 'CE', 'RUC', 'PASAPORTE')),
  document_number text check (char_length(document_number) <= 20),
  role        public.user_role not null default 'customer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- brands ----------
create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  logo_url    text,
  is_featured boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 60),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- products ----------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name            text not null check (char_length(name) between 2 and 120),
  brand_id        uuid not null references public.brands(id) on delete restrict,
  category_id     uuid references public.categories(id) on delete set null,
  model           text not null check (char_length(model) <= 80),
  tagline         text check (char_length(tagline) <= 160),
  description     text not null default '',
  processor       text not null default '',
  ram_gb          int  not null check (ram_gb between 1 and 64),
  storage_gb      int  not null check (storage_gb between 8 and 4096),
  display         text not null default '',
  camera          text not null default '',
  battery         text not null default '',
  os              text not null default '',
  extra_specs     jsonb not null default '{}'::jsonb,
  base_price      numeric(10,2) not null check (base_price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  -- Visual 3D
  model_url       text,              -- GLB/GLTF subido (Storage) o null => modelo procedural
  model_preset    text not null default 'square' check (model_preset in ('square', 'vertical', 'circle', 'bar')),
  is_active       boolean not null default true,
  is_featured     boolean not null default false,
  is_new          boolean not null default false,
  is_bestseller   boolean not null default false,
  sold_count      int not null default 0 check (sold_count >= 0),
  release_date    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active) where is_active;
create index if not exists products_price_idx on public.products(base_price);
create index if not exists products_flags_idx on public.products(is_featured, is_new, is_bestseller);
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- product_variants ----------
create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  sku             text not null unique check (char_length(sku) between 3 and 60),
  color_name      text not null check (char_length(color_name) <= 40),
  color_hex       text not null check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  ram_gb          int not null check (ram_gb between 1 and 64),
  storage_gb      int not null check (storage_gb between 8 and 4096),
  price           numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  is_default      boolean not null default false,
  is_active       boolean not null default true,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, color_name, ram_gb, storage_gb)
);
create index if not exists variants_product_idx on public.product_variants(product_id);
drop trigger if exists variants_updated_at on public.product_variants;
create trigger variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ---------- product_images ----------
create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  color_name  text,               -- imagen asociada a un color (null = todas)
  url         text not null,
  storage_path text,              -- ruta en Storage si fue subida (para borrar)
  alt         text not null default '',
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists images_product_idx on public.product_images(product_id, position);

-- ---------- inventory ----------
create table if not exists public.inventory (
  variant_id          uuid primary key references public.product_variants(id) on delete cascade,
  stock               int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  updated_at          timestamptz not null default now()
);
create index if not exists inventory_low_idx on public.inventory(stock);
drop trigger if exists inventory_updated_at on public.inventory;
create trigger inventory_updated_at before update on public.inventory
  for each row execute function public.set_updated_at();

-- ---------- inventory_movements ----------
create table if not exists public.inventory_movements (
  id          bigint generated always as identity primary key,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  delta       int not null check (delta <> 0),
  stock_after int not null,
  reason      text not null check (reason in ('initial', 'restock', 'adjustment', 'sale', 'return', 'cancellation')),
  note        text check (char_length(note) <= 300),
  order_id    uuid,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists movements_variant_idx on public.inventory_movements(variant_id, created_at desc);

-- ---------- addresses ----------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Casa' check (char_length(label) <= 40),
  recipient   text not null check (char_length(recipient) between 2 and 120),
  phone       text not null check (char_length(phone) between 6 and 30),
  department  text not null check (char_length(department) <= 60),
  province    text not null check (char_length(province) <= 60),
  district    text not null check (char_length(district) <= 60),
  line1       text not null check (char_length(line1) between 4 and 200),
  reference   text check (char_length(reference) <= 200),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

-- ---------- carts ----------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists carts_updated_at on public.carts;
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  quantity    int not null check (quantity between 1 and 10),
  created_at  timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);

-- ---------- coupons ----------
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          citext not null unique check (code ~* '^[A-Z0-9_-]{3,30}$'),
  description   text,
  type          public.coupon_type not null,
  value         numeric(10,2) not null check (value > 0),
  min_subtotal  numeric(10,2) not null default 0 check (min_subtotal >= 0),
  max_discount  numeric(10,2) check (max_discount is null or max_discount > 0),
  max_uses      int check (max_uses is null or max_uses > 0),
  used_count    int not null default 0 check (used_count >= 0),
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (type <> 'percent' or value <= 90),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- ---------- orders ----------
create sequence if not exists public.order_number_seq start 100001;
create sequence if not exists public.receipt_number_seq start 1;

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique default ('NX-' || nextval('public.order_number_seq')),
  user_id          uuid not null references auth.users(id) on delete restrict,
  status           public.order_status not null default 'pending_payment',
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  discount         numeric(10,2) not null default 0 check (discount >= 0),
  shipping_cost    numeric(10,2) not null default 0 check (shipping_cost >= 0),
  total            numeric(10,2) not null check (total >= 0),
  currency         text not null default 'PEN' check (currency = 'PEN'),
  coupon_id        uuid references public.coupons(id) on delete set null,
  coupon_code      text,
  shipping_method  public.shipping_method not null,
  shipping_address jsonb,
  payment_method   public.payment_method not null,
  customer_name    text not null,
  customer_email   text not null,
  customer_phone   text,
  document_type    text,
  document_number  text,
  receipt_type     text not null default 'boleta' check (receipt_type in ('boleta', 'factura')),
  receipt_number   text unique,
  tracking_code    text,
  notes            text check (char_length(notes) <= 500),
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Notas internas del equipo: tabla separada para que el cliente nunca pueda leerlas
create table if not exists public.order_internal_notes (
  order_id    uuid primary key references public.orders(id) on delete cascade,
  notes       text not null default '' check (char_length(notes) <= 4000),
  updated_at  timestamptz not null default now()
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variant_id    uuid references public.product_variants(id) on delete set null,
  product_name  text not null,
  variant_label text not null,
  sku           text not null,
  image_url     text,
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  quantity      int not null check (quantity between 1 and 10),
  line_total    numeric(10,2) not null check (line_total >= 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

create table if not exists public.order_status_history (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists order_history_idx on public.order_status_history(order_id, created_at);

-- ---------- payments ----------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  provider            text not null check (provider in ('mercadopago', 'bank_transfer', 'cash_on_pickup')),
  provider_payment_id text,
  provider_reference  text,
  status              public.payment_status not null default 'pending',
  status_detail       text,
  amount              numeric(10,2) not null check (amount >= 0),
  currency            text not null default 'PEN',
  is_test             boolean not null default true,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index if not exists payments_order_idx on public.payments(order_id);
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------- store_settings (fila única) ----------
create table if not exists public.store_settings (
  id                 int primary key default 1 check (id = 1),
  store_name         text not null default 'NEXPHONE',
  legal_name         text not null default 'NEXPHONE S.A.C.',
  ruc                text not null default '',
  email              text not null default 'contacto@nexphone.pe',
  phone              text not null default '',
  whatsapp           text not null default '',
  address            text not null default 'Lima, Perú',
  business_hours     text not null default 'Lun–Sáb 10:00–20:00',
  shipping_standard  numeric(10,2) not null default 15 check (shipping_standard >= 0),
  shipping_express   numeric(10,2) not null default 29 check (shipping_express >= 0),
  free_shipping_from numeric(10,2) not null default 1500 check (free_shipping_from >= 0),
  bank_details       text not null default '',
  announcement       text not null default '',
  updated_at         timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict do nothing;
drop trigger if exists settings_updated_at on public.store_settings;
create trigger settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
