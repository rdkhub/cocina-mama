-- Pedidos que llegan por WhatsApp y el papá registra en la app.
alter table public.orders add column if not exists origen text not null default 'app';
alter table public.orders add column if not exists mensaje_original text not null default '';
alter table public.orders add constraint orders_origen_valido check (origen in ('app', 'whatsapp', 'manual'));

-- Solo el admin puede registrar pedidos de WhatsApp o manuales.
alter policy "Clientes crean pedidos" on public.orders
  to anon, authenticated
  with check ((coalesce(listo, false) = false and origen = 'app' and mensaje_original = '') or public.es_admin());

-- No avisar al celular del papá por los pedidos que él mismo registra.
create or replace function public.avisar_pedido_nuevo()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_url text;
  v_secret text;
begin
  if coalesce(new.origen, 'app') <> 'app' then
    return new;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tipo', 'pedido', 'id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  raise warning 'avisar_pedido_nuevo: %', sqlerrm;
  return new;
end;
$function$;
