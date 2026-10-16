-- Secretos de las notificaciones en Supabase Vault (nada que pegar a mano).
-- La Edge Function lee la configuración con push_config() y, la primera vez,
-- genera y guarda sus claves VAPID con push_guardar_vapid().
create or replace function public.push_config()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('push_webhook_secret', 'push_vapid_keys');
$$;

create or replace function public.push_guardar_vapid(p_keys text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'push_vapid_keys';
  if v is not null then
    return v;
  end if;
  perform vault.create_secret(p_keys, 'push_vapid_keys', 'Claves VAPID de las notificaciones push (Cocina de Mamá)');
  return p_keys;
exception when unique_violation then
  select decrypted_secret into v from vault.decrypted_secrets where name = 'push_vapid_keys';
  return v;
end;
$$;

revoke all on function public.push_config() from public, anon, authenticated;
revoke all on function public.push_guardar_vapid(text) from public, anon, authenticated;
grant execute on function public.push_config() to service_role;
grant execute on function public.push_guardar_vapid(text) to service_role;

-- Si el proyecto cambia, reemplaza la URL de abajo por la de tu proyecto.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret',
      'Clave compartida entre el trigger de pedidos y la Edge Function notificar-pedido');
  end if;
  if not exists (select 1 from vault.secrets where name = 'push_function_url') then
    perform vault.create_secret('https://kdgtddqxwrjhyudixqaf.supabase.co/functions/v1/notificar-pedido', 'push_function_url',
      'URL de la Edge Function que envía las notificaciones de pedidos');
  end if;
end $$;
