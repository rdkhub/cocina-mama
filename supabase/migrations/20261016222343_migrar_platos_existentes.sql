-- Pasa los platos que ya existían (pedidos, menú y platos_frecuentes) al catálogo.
-- No borra ni cambia nada de las tablas viejas.

-- Entradas: del historial de pedidos y del menú actual, sin duplicar por tildes o espacios.
with nombres as (
  select trim(e->>'nombre') as nombre from public.orders o, jsonb_array_elements(o.entradas) e
  union all
  select trim(x) from public.menu m, jsonb_array_elements_text(m.entradas) x
),
normalizados as (
  select nombre,
         translate(lower(regexp_replace(nombre, '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu') as clave
  from nombres where coalesce(nombre, '') <> ''
),
elegidos as (
  select distinct on (clave) clave, nombre
  from (select clave, nombre, count(*) as usos from normalizados group by clave, nombre) c
  order by clave, usos desc, nombre
)
insert into public.platos (nombre, categoria)
select nombre, 'entrada' from elegidos
on conflict do nothing;

-- Segundos: de platos_frecuentes y de los fondos del menú actual.
with candidatos as (
  select trim(pf.nombre) as nombre,
         coalesce(pf.requiere_proteina, false) as requiere_proteina,
         coalesce(pf.permite_arroz, false) as permite_arroz,
         pf.creado_en
  from public.platos_frecuentes pf
  union all
  select trim(f->>'nombre'),
         nullif(trim(coalesce(f->>'proteinas', '')), '') is not null,
         coalesce((f->>'permiteArroz')::boolean, false),
         now()
  from public.menu m, jsonb_array_elements(m.fondos) f
  where jsonb_typeof(f) = 'object'
),
normalizados as (
  select *, translate(lower(regexp_replace(nombre, '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu') as clave
  from candidatos where coalesce(nombre, '') <> ''
),
elegidos as (
  select distinct on (clave) nombre, requiere_proteina, permite_arroz, creado_en
  from normalizados
  where clave not in (
    select translate(lower(regexp_replace(nombre, '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu')
    from public.platos where categoria = 'entrada'
  )
  order by clave, requiere_proteina desc, permite_arroz desc, creado_en desc
)
insert into public.platos (nombre, categoria, requiere_proteina, permite_arroz, creado_en)
select nombre, 'segundo', requiere_proteina, permite_arroz, creado_en from elegidos
on conflict do nothing;

-- El menú publicado hoy pasa a menu_dia / menu_dia_items.
insert into public.menu_dia (fecha, refresco)
select m.fecha, trim(coalesce(m.bebida, ''))
from public.menu m
where m.id = 1 and m.fecha ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (fecha) do nothing;

insert into public.menu_dia_items (fecha, plato_id, proteinas, orden)
select m.fecha, p.id,
       coalesce(
         (select array_agg(trim(x)) from unnest(string_to_array(coalesce(ord.f->>'proteinas', ''), ',')) x where trim(x) <> ''),
         '{}'
       ),
       ord.n
from public.menu m
cross join lateral jsonb_array_elements(m.fondos) with ordinality as ord(f, n)
join public.platos p
  on p.categoria = 'segundo'
 and translate(lower(regexp_replace(p.nombre, '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu')
   = translate(lower(regexp_replace(trim(ord.f->>'nombre'), '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu')
where m.id = 1 and m.fecha ~ '^\d{4}-\d{2}-\d{2}$' and jsonb_typeof(ord.f) = 'object'
on conflict (fecha, plato_id) do nothing;

insert into public.menu_dia_items (fecha, plato_id, orden)
select m.fecha, p.id, 100 + ord.n
from public.menu m
cross join lateral jsonb_array_elements_text(m.entradas) with ordinality as ord(x, n)
join public.platos p
  on p.categoria = 'entrada'
 and translate(lower(regexp_replace(p.nombre, '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu')
   = translate(lower(regexp_replace(trim(ord.x), '\s+', ' ', 'g')), 'áéíóúü', 'aeiouu')
where m.id = 1 and m.fecha ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (fecha, plato_id) do nothing;
