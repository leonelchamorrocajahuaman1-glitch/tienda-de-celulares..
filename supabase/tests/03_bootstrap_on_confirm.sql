\set QUIET on
\pset tuples_only on
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FALLO: %', label; end if;
  raise notice 'OK: %', label;
end $$;
select nexphone_meta.set_bootstrap_admin('Duena@Tienda.pe');
insert into auth.users (id, email) values ('66666666-6666-4666-a666-666666666666', 'otra@tienda.pe');
insert into auth.users (id, email) values ('77777777-7777-4777-a777-777777777777', 'duena@tienda.pe');
select pg_temp.check((select role from public.profiles where id = '77777777-7777-4777-a777-777777777777') = 'customer', 'confirmación: sin confirmar sigue siendo cliente');
update auth.users set email_confirmed_at = now() where id = '66666666-6666-4666-a666-666666666666';
select pg_temp.check((select role from public.profiles where id = '66666666-6666-4666-a666-666666666666') = 'customer', 'confirmación: otro correo no se promueve');
update auth.users set email_confirmed_at = now() where id = '77777777-7777-4777-a777-777777777777';
select pg_temp.check((select role from public.profiles where id = '77777777-7777-4777-a777-777777777777') = 'admin', 'confirmación: correo autorizado pasa a admin');
-- Alta con correo ya confirmado (autoconfirm) cuando ya existe admin: no promueve a otro
delete from public.profiles where id = '77777777-7777-4777-a777-777777777777' and false;
select nexphone_meta.set_bootstrap_admin('nuevo@tienda.pe');
insert into auth.users (id, email, email_confirmed_at) values ('88888888-8888-4888-a888-888888888888', 'nuevo@tienda.pe', now());
select pg_temp.check((select role from public.profiles where id = '88888888-8888-4888-a888-888888888888') = 'customer', 'confirmación: no crea un segundo admin');
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"66666666-6666-4666-a666-666666666666"}', false);
set role authenticated;
do $$ begin
  perform nexphone_meta.set_bootstrap_admin('yo@x.pe');
  raise exception 'FALLO: cliente cambió el correo autorizado';
exception when insufficient_privilege then raise notice 'OK: confirmación: clientes no pueden cambiar el correo autorizado';
end $$;
reset role;
\echo 'PRUEBAS DE CONFIRMACIÓN OK'
