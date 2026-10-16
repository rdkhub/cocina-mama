-- Validación y total de los pedidos nuevos (formato 2) + aviso push.
create or replace function public.validar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia public.menu_dia%rowtype;
  v_nombre text;
  v_menus int := 0;
  v_incluidas int := 0;
  v_entradas int := 0;
  v_adicional numeric := 0;
begin
  if coalesce(new.formato, 1) < 2 then
    return new;
  end if;

  select * into v_dia from public.menu_dia where fecha = new.fecha;
  if not found then
    raise exception 'MENU_NO_DISPONIBLE: el menú de este día todavía no está publicado';
  end if;

  if exists (
    select 1 from (
      select f->>'cantidad' c from jsonb_array_elements(coalesce(new.fondos, '[]')) f
      union all select e->>'cantidad' from jsonb_array_elements(coalesce(new.entradas, '[]')) e
      union all select a->>'cantidad' from jsonb_array_elements(coalesce(new.adicionales, '[]')) a
    ) x where coalesce(x.c, '') !~ '^\d+$' or x.c::int < 1 or x.c::int > 50
  ) then
    raise exception 'PEDIDO_INVALIDO: cantidad no válida';
  end if;

  select coalesce(p.nombre, 'un plato') into v_nombre
  from (
    select (f->>'platoId')::uuid as id from jsonb_array_elements(coalesce(new.fondos, '[]')) f
    union select (f->>'entradaId')::uuid from jsonb_array_elements(coalesce(new.fondos, '[]')) f
      where coalesce(f->>'entradaId', '') <> ''
    union select (e->>'platoId')::uuid from jsonb_array_elements(coalesce(new.entradas, '[]')) e
    union select (a->>'platoId')::uuid from jsonb_array_elements(coalesce(new.adicionales, '[]')) a
  ) ids
  left join public.menu_dia_items i on i.plato_id = ids.id and i.fecha = new.fecha
  left join public.platos p on p.id = ids.id
  where ids.id is null or i.id is null or i.agotado
  limit 1;

  if found then
    raise exception 'AGOTADO: %', v_nombre;
  end if;

  select p.nombre into v_nombre
  from jsonb_array_elements(coalesce(new.fondos, '[]')) f
  join public.menu_dia_items i on i.plato_id = (f->>'platoId')::uuid and i.fecha = new.fecha
  join public.platos p on p.id = i.plato_id
  where coalesce(f->>'proteina', '') <> '' and not ((f->>'proteina') = any (i.proteinas))
  limit 1;

  if found then
    raise exception 'AGOTADO: la proteína elegida para %', v_nombre;
  end if;

  select coalesce(sum((f->>'cantidad')::int), 0),
         coalesce(sum((f->>'cantidad')::int) filter (where coalesce(f->>'entradaIncluida', '') <> ''), 0)
    into v_menus, v_incluidas
  from jsonb_array_elements(coalesce(new.fondos, '[]')) f;

  select coalesce(sum((e->>'cantidad')::int), 0) into v_entradas
  from jsonb_array_elements(coalesce(new.entradas, '[]')) e;

  select coalesce(sum((a->>'cantidad')::int * p.precio_extra), 0),
         coalesce(jsonb_agg(a || jsonb_build_object('precio', p.precio_extra)), '[]'::jsonb)
    into v_adicional, new.adicionales
  from jsonb_array_elements(coalesce(new.adicionales, '[]')) a
  join public.platos p on p.id = (a->>'platoId')::uuid;

  new.total := v_menus * (case when new.modo = 'delivery' then v_dia.precio_delivery else v_dia.precio_recojo end)
             + greatest(0, v_entradas - v_incluidas) * v_dia.precio_entrada_extra
             + v_adicional;

  if new.total <= 0 then
    raise exception 'PEDIDO_INVALIDO: el pedido está vacío';
  end if;

  return new;
end;
$$;

create or replace function public.registrar_suscripcion(
  p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text default ''
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
language sql
security definer
set search_path = public
as $$
  delete from public.push_suscripciones where endpoint = p_endpoint;
$$;

revoke all on function public.registrar_suscripcion(text, text, text, text) from public;
revoke all on function public.quitar_suscripcion(text) from public;
grant execute on function public.registrar_suscripcion(text, text, text, text) to anon, authenticated;
grant execute on function public.quitar_suscripcion(text) to anon, authenticated;

create extension if not exists pg_net with schema extensions;

create or replace function public.avisar_pedido_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_secret text;
begin
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
  -- El aviso nunca debe impedir que el pedido se guarde.
  raise warning 'avisar_pedido_nuevo: %', sqlerrm;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'orders_validar_pedido' and tgrelid = 'public.orders'::regclass) then
    create trigger orders_validar_pedido before insert on public.orders
      for each row execute function public.validar_pedido();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'orders_avisar_pedido' and tgrelid = 'public.orders'::regclass) then
    create trigger orders_avisar_pedido after insert on public.orders
      for each row execute function public.avisar_pedido_nuevo();
  end if;
end $$;
