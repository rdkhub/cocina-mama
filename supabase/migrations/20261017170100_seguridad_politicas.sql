-- Parte 2: cerrar la base. Se aplica cuando el panel ya entra con Supabase Auth
-- (si se aplica antes, la versión vieja de la app pierde el panel).

-- Quitar todas las políticas abiertas de las tablas de la app.
do $$
declare pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'platos', 'menu_dia', 'menu_dia_items', 'ajustes', 'menu', 'proteinas', 'platos_frecuentes')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'platos:%'
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- Pedidos: el cliente solo puede crear (el trigger validar_pedido revisa y
-- calcula el total). Leer, marcar listo/pagado y borrar es solo del admin.
create policy "Clientes crean pedidos" on public.orders
  for insert to anon, authenticated
  with check (coalesce(listo, false) = false or public.es_admin());
create policy "Admin lee pedidos" on public.orders
  for select to authenticated using (public.es_admin());
create policy "Admin edita pedidos" on public.orders
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "Admin borra pedidos" on public.orders
  for delete to authenticated using (public.es_admin());

-- Catálogo y menú: lectura pública, escritura solo admin.
do $$
declare t text;
begin
  foreach t in array array['platos', 'menu_dia', 'menu_dia_items', 'ajustes', 'menu', 'proteinas', 'platos_frecuentes'] loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', 'Todos leen ' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.es_admin())', 'Admin crea ' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.es_admin()) with check (public.es_admin())', 'Admin edita ' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.es_admin())', 'Admin borra ' || t, t);
  end loop;
end $$;

-- Fotos: cualquiera las ve (bucket público), solo el admin sube/cambia/borra.
create policy "platos: ver fotos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'platos');
create policy "platos: subir fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'platos' and public.es_admin());
create policy "platos: cambiar fotos" on storage.objects
  for update to authenticated using (bucket_id = 'platos' and public.es_admin()) with check (bucket_id = 'platos' and public.es_admin());
create policy "platos: borrar fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'platos' and public.es_admin());

-- Notificaciones: solo el admin registra/quita celulares (si no, cualquiera
-- podría suscribirse y recibir los datos de los pedidos).
create or replace function public.registrar_suscripcion(p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'NO_AUTORIZADO';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Suscripción no válida';
  end if;
  insert into public.push_suscripciones (endpoint, p256dh, auth, dispositivo)
  values (p_endpoint, p_p256dh, p_auth, left(coalesce(p_dispositivo, ''), 200))
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, dispositivo = excluded.dispositivo;
end;
$$;

create or replace function public.quitar_suscripcion(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'NO_AUTORIZADO';
  end if;
  delete from public.push_suscripciones where endpoint = p_endpoint;
end;
$$;

revoke execute on function public.registrar_suscripcion(text, text, text, text) from anon, public;
revoke execute on function public.quitar_suscripcion(text) from anon, public;
grant execute on function public.registrar_suscripcion(text, text, text, text) to authenticated;
grant execute on function public.quitar_suscripcion(text) to authenticated;
