-- Bucket público para las fotos de los platos (máx. 300 KB) y realtime.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('platos', 'platos', true, 307200, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare pol record;
begin
  for pol in
    select * from (values
      ('platos: ver fotos', 'select', 'using (bucket_id = ''platos'')'),
      ('platos: subir fotos', 'insert', 'with check (bucket_id = ''platos'')'),
      ('platos: cambiar fotos', 'update', 'using (bucket_id = ''platos'') with check (bucket_id = ''platos'')'),
      ('platos: borrar fotos', 'delete', 'using (bucket_id = ''platos'')')
    ) as t(nombre, cmd, cuerpo)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = pol.nombre) then
      execute format('create policy %I on storage.objects for %s to anon, authenticated %s', pol.nombre, pol.cmd, pol.cuerpo);
    end if;
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['platos', 'menu_dia', 'menu_dia_items', 'ajustes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
