-- Cuaderno: el admin puede corregir un pedido ya guardado (platos, recojo o
-- delivery). El total se vuelve a calcular en la base con la misma función
-- que al crearlo, así nunca lo pone la pantalla.
--
-- Al editar no se revisa "agotado": el plato pudo agotarse después de que el
-- cliente lo pidió, y el pedido igual hay que cobrarlo. Sí se exige que cada
-- plato esté en el menú de ese día.
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
  v_es_nuevo boolean := tg_op = 'INSERT';
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
  where ids.id is null or i.id is null or (v_es_nuevo and i.agotado)
  limit 1;

  if found then
    raise exception 'AGOTADO: %', v_nombre;
  end if;

  if v_es_nuevo then
    select p.nombre into v_nombre
    from jsonb_array_elements(coalesce(new.fondos, '[]')) f
    join public.menu_dia_items i on i.plato_id = (f->>'platoId')::uuid and i.fecha = new.fecha
    join public.platos p on p.id = i.plato_id
    where coalesce(f->>'proteina', '') <> '' and not ((f->>'proteina') = any (i.proteinas))
    limit 1;

    if found then
      raise exception 'AGOTADO: la proteína elegida para %', v_nombre;
    end if;
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

-- Solo corre cuando cambian los platos o el modo (marcar listo o pagado no
-- recalcula nada). Editar pedidos ya es solo del admin (política "Admin edita pedidos").
drop trigger if exists orders_revalidar_pedido on public.orders;
create trigger orders_revalidar_pedido before update of fondos, entradas, adicionales, modo, fecha on public.orders
  for each row execute function public.validar_pedido();

revoke all on function public.validar_pedido() from public, anon, authenticated;
