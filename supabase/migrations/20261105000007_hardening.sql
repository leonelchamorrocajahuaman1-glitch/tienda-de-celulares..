-- =====================================================================
-- NEXPHONE — Endurecimiento según el Security Advisor de Supabase
-- =====================================================================
-- search_path fijo en la función de triggers updated_at
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Las funciones de trigger no deben poder invocarse vía /rest/v1/rpc (los triggers siguen funcionando)
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_privileges() from public, anon, authenticated;
revoke all on function public.create_inventory_row() from public, anon, authenticated;
revoke all on function public.single_default_address() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
