-- Catálogo de platos, menú del día, ajustes y suscripciones push.
create table if not exists public.platos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  categoria text not null check (categoria in ('entrada', 'segundo', 'postre', 'bebida', 'adicional')),
  descripcion text not null default '',
  foto_url text,
  foto_path text,
  requiere_proteina boolean not null default false,
  permite_arroz boolean not null default false,
  precio_extra numeric(8,2) not null default 0 check (precio_extra >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
create unique index if not exists platos_categoria_nombre_uq on public.platos (categoria, lower(trim(nombre)));

create table if not exists public.menu_dia (
  fecha text primary key check (fecha ~ '^\d{4}-\d{2}-\d{2}$'),
  precio_recojo numeric(8,2) not null default 11 check (precio_recojo >= 0),
  precio_delivery numeric(8,2) not null default 13 check (precio_delivery >= 0),
  precio_entrada_extra numeric(8,2) not null default 3 check (precio_entrada_extra >= 0),
  refresco text not null default '',
  nota text not null default '',
  creado_en timestamptz not null default now()
);

create table if not exists public.menu_dia_items (
  id uuid primary key default gen_random_uuid(),
  fecha text not null references public.menu_dia (fecha) on delete cascade,
  plato_id uuid not null references public.platos (id),
  proteinas text[] not null default '{}',
  agotado boolean not null default false,
  orden int not null default 0,
  creado_en timestamptz not null default now(),
  unique (fecha, plato_id)
);
create index if not exists menu_dia_items_fecha_idx on public.menu_dia_items (fecha);
create index if not exists menu_dia_items_plato_idx on public.menu_dia_items (plato_id);

create table if not exists public.ajustes (
  id int primary key default 1 check (id = 1),
  plantilla_saludo text not null default '¡Hola! 👋 Este es el *menú de hoy* en *Cocina de Mamá*:',
  plantilla_cierre text not null default '¡Te esperamos! 😊'
);
insert into public.ajustes (id) values (1) on conflict (id) do nothing;

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  dispositivo text not null default '',
  creado_en timestamptz not null default now(),
  ultimo_envio timestamptz
);

alter table public.platos enable row level security;
alter table public.menu_dia enable row level security;
alter table public.menu_dia_items enable row level security;
alter table public.ajustes enable row level security;
alter table public.push_suscripciones enable row level security;
-- push_suscripciones no tiene políticas: solo se toca con las funciones RPC.
-- platos no tiene política de borrado: los platos se desactivan, no se borran.

do $$
declare
  pol record;
begin
  for pol in
    select * from (values
      ('platos', 'Cualquiera puede leer platos', 'select', 'using (true)'),
      ('platos', 'Cualquiera puede crear platos', 'insert', 'with check (true)'),
      ('platos', 'Cualquiera puede editar platos', 'update', 'using (true) with check (true)'),
      ('menu_dia', 'Cualquiera puede leer menu_dia', 'select', 'using (true)'),
      ('menu_dia', 'Cualquiera puede crear menu_dia', 'insert', 'with check (true)'),
      ('menu_dia', 'Cualquiera puede editar menu_dia', 'update', 'using (true) with check (true)'),
      ('menu_dia_items', 'Cualquiera puede leer items', 'select', 'using (true)'),
      ('menu_dia_items', 'Cualquiera puede crear items', 'insert', 'with check (true)'),
      ('menu_dia_items', 'Cualquiera puede editar items', 'update', 'using (true) with check (true)'),
      ('menu_dia_items', 'Cualquiera puede quitar items', 'delete', 'using (true)'),
      ('ajustes', 'Cualquiera puede leer ajustes', 'select', 'using (true)'),
      ('ajustes', 'Cualquiera puede editar ajustes', 'update', 'using (true) with check (true)')
    ) as t(tabla, nombre, cmd, cuerpo)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = pol.tabla and policyname = pol.nombre) then
      execute format('create policy %I on public.%I for %s %s', pol.nombre, pol.tabla, pol.cmd, pol.cuerpo);
    end if;
  end loop;
end $$;
