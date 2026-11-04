-- =====================================================================
-- NEXPHONE — Costos de variantes (para ganancias) — solo administradores.
-- Tabla separada para que el costo nunca sea visible en el catálogo público.
-- =====================================================================
create table if not exists public.variant_costs (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  cost_price numeric(10,2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);
alter table public.variant_costs enable row level security;
create policy "variant_costs: admin" on public.variant_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.variant_costs from anon;

-- Ganancia estimada de pedidos pagados (ingreso por productos - costo registrado)
create or replace function public.admin_profit_summary(p_from timestamptz, p_to timestamptz)
returns table (revenue numeric, cost numeric, profit numeric, orders bigint, units bigint, missing_cost_units bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
  select coalesce(sum(oi.line_total), 0),
         coalesce(sum(vc.cost_price * oi.quantity), 0),
         coalesce(sum(oi.line_total), 0) - coalesce(sum(vc.cost_price * oi.quantity), 0),
         count(distinct o.id),
         coalesce(sum(oi.quantity), 0)::bigint,
         coalesce(sum(case when vc.cost_price is null then oi.quantity else 0 end), 0)::bigint
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.variant_costs vc on vc.variant_id = oi.variant_id
  where o.paid_at is not null and o.status not in ('cancelled', 'refunded', 'requires_attention')
    and o.paid_at >= p_from and o.paid_at < p_to;
end $$;
revoke all on function public.admin_profit_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_profit_summary(timestamptz, timestamptz) to authenticated;

-- Resumen de clientes para el panel (pedidos y monto comprado)
create or replace function public.admin_customers()
returns table (id uuid, email text, full_name text, phone text, document_type text, document_number text,
               role public.user_role, is_active boolean, created_at timestamptz, orders bigint, spent numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
  select p.id, p.email::text, p.full_name, p.phone, p.document_type, p.document_number, p.role, p.is_active, p.created_at,
         count(o.id), coalesce(sum(o.total) filter (where o.paid_at is not null and o.status not in ('cancelled','refunded')), 0)
  from public.profiles p left join public.orders o on o.user_id = p.id
  group by p.id order by p.created_at desc;
end $$;
revoke all on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
