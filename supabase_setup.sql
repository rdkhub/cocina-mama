-- =====================================================================
-- COCINA DE MAMÁ — Configuración de base de datos en Supabase
-- Copia y pega TODO este archivo en: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- Tabla del menú del día (siempre una sola fila, id = 1)
create table if not exists menu (
  id int primary key default 1,
  fondos jsonb not null default '[]',
  entradas jsonb not null default '[]',
  bebida text default '',
  fecha text default ''
);

-- Tabla de pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  fondos jsonb not null default '[]',      -- [{ nombre, cantidad }, ...]
  entradas jsonb not null default '[]',     -- [{ nombre, cantidad }, ...]
  bebida jsonb,                              -- { nombre, cantidad } o null
  modo text not null,                        -- 'recojo' | 'delivery'
  direccion text default '',
  pago text not null,                        -- 'yape' | 'efectivo' | 'fiado'
  notas text default '',
  fecha text not null,                       -- 'YYYY-MM-DD'
  creado_en timestamptz not null default now(),
  listo boolean default false,
  pagado boolean default false
);

-- Índice para que filtrar pedidos por fecha sea rápido
create index if not exists idx_orders_fecha on orders (fecha);

-- Fila inicial del menú (con tu menú de ejemplo actual)
insert into menu (id, fondos, entradas, bebida, fecha)
values (
  1,
  '["Arroz con pollo + papa a la huancaína", "Lomo saltado"]',
  '["Ensalada de tomate", "Ensalada de palta", "Ensalada de fideos"]',
  'Chicha morada',
  to_char(now(), 'YYYY-MM-DD')
)
on conflict (id) do nothing;

-- =====================================================================
-- SEGURIDAD: habilitar acceso público de lectura/escritura
-- (Como no hay login de clientes, usamos políticas abiertas para que
-- cualquiera con el link pueda pedir y la tablet del local pueda
-- leer/actualizar. El PIN de la app sigue protegiendo el panel visualmente,
-- pero técnicamente cualquiera con la URL de Supabase podría escribir.
-- Para un negocio familiar chico esto es razonable; si más adelante
-- quieres más seguridad real, se puede agregar autenticación.)
-- =====================================================================

alter table menu enable row level security;
alter table orders enable row level security;

create policy "Cualquiera puede leer el menú" on menu
  for select using (true);

create policy "Cualquiera puede actualizar el menú" on menu
  for all using (true) with check (true);

create policy "Cualquiera puede leer pedidos" on orders
  for select using (true);

create policy "Cualquiera puede crear pedidos" on orders
  for insert with check (true);

create policy "Cualquiera puede actualizar pedidos" on orders
  for update using (true) with check (true);

create policy "Cualquiera puede borrar pedidos" on orders
  for delete using (true);

-- =====================================================================
-- REALTIME: para que el panel de la tablet vea pedidos nuevos al instante
-- =====================================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table menu;
