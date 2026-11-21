-- "En casa": el cliente come aquí (se lleva los platos de la casa y los
-- devuelve). Se cobra un precio propio por menú (S/ 11 por defecto), la
-- entrada extra y los adicionales siguen igual.
--
-- 1. menu_dia.precio_casa, editable en "Precios de hoy".
-- 2. validar_pedido: el modo solo puede ser recojo, delivery o casa; "casa"
--    solo lo puede usar el admin (desde el Cuaderno), para que nadie lo use
--    desde la página para pagar menos; el precio del menú sale de precio_casa.
--    Lo demás es igual a 20261121120000_adicionales_fijos.sql.

alter table public.menu_dia add column if not exists precio_casa numeric(8,2) not null default 11;
alter table public.menu_dia drop constraint if exists menu_dia_precio_casa_check;
alter table public.menu_dia add constraint menu_dia_precio_casa_check check (precio_casa >= 0);

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

  if new.modo is null or new.modo not in ('recojo', 'delivery', 'casa') then
    raise exception 'PEDIDO_INVALIDO: modo no válido';
  end if;
  -- Solo revisa "casa" si el modo cambia (o es nuevo): así marcar pagado o
  -- listo nunca choca con esto.
  if new.modo = 'casa' and not public.es_admin() then
    if v_es_nuevo then
      raise exception 'PEDIDO_INVALIDO: solo el admin puede anotar pedidos en casa';
    elsif old.modo is distinct from 'casa' then
      raise exception 'PEDIDO_INVALIDO: solo el admin puede anotar pedidos en casa';
    end if;
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
    select (f->>'platoId')::uuid as id, false as es_adicional from jsonb_array_elements(coalesce(new.fondos, '[]')) f
    union select (f->>'entradaId')::uuid, false from jsonb_array_elements(coalesce(new.fondos, '[]')) f
      where coalesce(f->>'entradaId', '') <> ''
    union select (e->>'platoId')::uuid, false from jsonb_array_elements(coalesce(new.entradas, '[]')) e
    union select (a->>'platoId')::uuid, true from jsonb_array_elements(coalesce(new.adicionales, '[]')) a
  ) ids
  left join public.menu_dia_items i on i.plato_id = ids.id and i.fecha = new.fecha
  left join public.platos p on p.id = ids.id
  where ids.id is null
     or (i.id is null and not (ids.es_adicional and p.categoria = 'adicional' and p.activo and p.precio_extra > 0))
     or (v_es_nuevo and i.agotado)
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

  new.total := v_menus * (case new.modo
                            when 'delivery' then v_dia.precio_delivery
                            when 'casa' then v_dia.precio_casa
                            else v_dia.precio_recojo end)
             + greatest(0, v_entradas - v_incluidas) * v_dia.precio_entrada_extra
             + v_adicional;

  if new.total <= 0 then
    raise exception 'PEDIDO_INVALIDO: el pedido está vacío';
  end if;

  return new;
end;
$$;
