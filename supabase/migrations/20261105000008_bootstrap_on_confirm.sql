-- =====================================================================
-- NEXPHONE — Primer administrador al confirmar el correo (sin variables de entorno)
-- El correo autorizado se guarda en nexphone_meta.config (esquema NO expuesto por la API).
-- Se configura una sola vez por SQL:  select nexphone_meta.set_bootstrap_admin('correo@dominio');
-- =====================================================================
create schema if not exists nexphone_meta;
revoke all on schema nexphone_meta from public, anon, authenticated;

create table if not exists nexphone_meta.config (
  key   text primary key,
  value text not null
);
revoke all on nexphone_meta.config from public, anon, authenticated;

create or replace function nexphone_meta.set_bootstrap_admin(p_email text) returns void
language sql security definer set search_path = nexphone_meta, public as $$
  insert into nexphone_meta.config (key, value) values ('bootstrap_admin_email', lower(btrim(p_email)))
  on conflict (key) do update set value = excluded.value;
$$;
revoke all on function nexphone_meta.set_bootstrap_admin(text) from public, anon, authenticated;

-- Al crear o confirmar un usuario: si es el correo autorizado, está confirmado y no hay admins → admin.
create or replace function public.bootstrap_admin_on_confirm() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_target text;
begin
  if new.email_confirmed_at is null then return new; end if;
  select value into v_target from nexphone_meta.config where key = 'bootstrap_admin_email';
  if v_target is null or lower(new.email) <> v_target then return new; end if;
  perform pg_advisory_xact_lock(hashtext('nexphone_bootstrap_admin'));
  if exists (select 1 from public.profiles where role = 'admin' and is_active) then return new; end if;
  update public.profiles set role = 'admin', is_active = true where id = new.id;
  return new;
end $$;
revoke all on function public.bootstrap_admin_on_confirm() from public, anon, authenticated;

-- Nombre "zz_" para ejecutarse después de on_auth_user_created (que crea el perfil)
drop trigger if exists zz_nexphone_bootstrap_admin on auth.users;
create trigger zz_nexphone_bootstrap_admin
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.bootstrap_admin_on_confirm();
