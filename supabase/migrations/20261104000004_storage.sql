-- =====================================================================
-- NEXPHONE — Supabase Storage (imágenes y modelos 3D)
-- Lectura pública, escritura exclusiva de administradores.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('product-models', 'product-models', true, 31457280,
     array['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', 'application/json',
           'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nexphone: lectura pública de medios" on storage.objects;
create policy "nexphone: lectura pública de medios" on storage.objects
  for select using (bucket_id in ('product-images', 'product-models'));

drop policy if exists "nexphone: admin sube medios" on storage.objects;
create policy "nexphone: admin sube medios" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'product-models') and public.is_admin());

drop policy if exists "nexphone: admin actualiza medios" on storage.objects;
create policy "nexphone: admin actualiza medios" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());

drop policy if exists "nexphone: admin elimina medios" on storage.objects;
create policy "nexphone: admin elimina medios" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'product-models') and public.is_admin());
