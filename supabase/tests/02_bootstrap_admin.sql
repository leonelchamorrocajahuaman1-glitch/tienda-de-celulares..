-- Pruebas del primer administrador automático
\set QUIET on
\pset tuples_only on
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FALLO: %', label; end if;
  raise notice 'OK: %', label;
end $$;

insert into auth.users (id, email) values ('44444444-4444-4444-a444-444444444444', 'Duena@Tienda.pe');

-- Llamada directa del propietario (sin JWT), como hace el servidor con service_role
select pg_temp.check(public.bootstrap_first_admin('otra@tienda.pe') = 'usuario_no_registrado', 'bootstrap: correo no registrado');
select pg_temp.check(public.bootstrap_first_admin('duena@tienda.pe') = 'correo_sin_confirmar', 'bootstrap: exige correo confirmado');
update auth.users set email_confirmed_at = now() where id = '44444444-4444-4444-a444-444444444444';

-- Un usuario autenticado no puede invocarla
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-a444-444444444444","role":"authenticated"}', false);
set role authenticated;
do $$ begin
  perform public.bootstrap_first_admin('duena@tienda.pe');
  raise exception 'FALLO: cliente ejecutó bootstrap';
exception when insufficient_privilege then raise notice 'OK: bootstrap: clientes no pueden ejecutarla';
end $$;
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
set role service_role;
select pg_temp.check(public.bootstrap_first_admin('duena@tienda.pe') = 'promovido', 'bootstrap: promueve (sin distinguir mayúsculas)');
select pg_temp.check(public.bootstrap_first_admin('duena@tienda.pe') = 'ya_existe_admin', 'bootstrap: solo funciona sin administradores');
select pg_temp.check((public.nexphone_schema_status() ->> 'tables')::int = 19, 'estado: 19 tablas');
select pg_temp.check((public.nexphone_schema_status() ->> 'functions')::int = 14, 'estado: 14 funciones');
select pg_temp.check(public.nexphone_schema_status() -> 'rls_disabled' = '[]'::jsonb, 'estado: RLS activo en todas las tablas');
reset role;
\echo 'PRUEBAS DE BOOTSTRAP OK'
