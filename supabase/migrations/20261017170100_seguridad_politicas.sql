-- Parte 2: cerrar la base (aplicada el 17/10/2026, después del deploy del login).
-- Se modifican las políticas existentes en vez de borrarlas.

-- Pedidos: el cliente solo crea; leer, editar y borrar es del admin.
alter policy "Cualquiera puede leer pedidos" on public.orders to authenticated using (public.es_admin());
alter policy "Cualquiera puede leer pedidos" on public.orders rename to "Admin lee pedidos";
alter policy "Cualquiera puede actualizar pedidos" on public.orders to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede actualizar pedidos" on public.orders rename to "Admin edita pedidos";
alter policy "Cualquiera puede borrar pedidos" on public.orders to authenticated using (public.es_admin());
alter policy "Cualquiera puede borrar pedidos" on public.orders rename to "Admin borra pedidos";
alter policy "Cualquiera puede crear pedidos" on public.orders to anon, authenticated with check (coalesce(listo, false) = false or public.es_admin());
alter policy "Cualquiera puede crear pedidos" on public.orders rename to "Clientes crean pedidos";

-- Catálogo y menú: la lectura sigue pública; escribir es solo del admin.
alter policy "Cualquiera puede editar ajustes" on public.ajustes to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede actualizar el menú" on public.menu to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede crear menu_dia" on public.menu_dia to authenticated with check (public.es_admin());
alter policy "Cualquiera puede editar menu_dia" on public.menu_dia to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede crear items" on public.menu_dia_items to authenticated with check (public.es_admin());
alter policy "Cualquiera puede editar items" on public.menu_dia_items to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede quitar items" on public.menu_dia_items to authenticated using (public.es_admin());
alter policy "Cualquiera puede crear platos" on public.platos to authenticated with check (public.es_admin());
alter policy "Cualquiera puede editar platos" on public.platos to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede crear platos frecuentes" on public.platos_frecuentes to authenticated with check (public.es_admin());
alter policy "Cualquiera puede actualizar platos frecuentes" on public.platos_frecuentes to authenticated using (public.es_admin()) with check (public.es_admin());
alter policy "Cualquiera puede crear proteinas" on public.proteinas to authenticated with check (public.es_admin());

-- Fotos: se ven públicas; subir, cambiar y borrar es del admin.
alter policy "platos: subir fotos" on storage.objects to authenticated with check (bucket_id = 'platos' and public.es_admin());
alter policy "platos: cambiar fotos" on storage.objects to authenticated using (bucket_id = 'platos' and public.es_admin()) with check (bucket_id = 'platos' and public.es_admin());
alter policy "platos: borrar fotos" on storage.objects to authenticated using (bucket_id = 'platos' and public.es_admin());

-- Notificaciones: solo el admin registra un celular.
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

revoke execute on function public.quitar_suscripcion(text) from anon, public;
revoke execute on function public.registrar_suscripcion(text, text, text, text) from anon, public;
grant execute on function public.quitar_suscripcion(text) to authenticated;
grant execute on function public.registrar_suscripcion(text, text, text, text) to authenticated;
