-- Seguridad del panel de administración.
--
-- Antes el PIN solo se revisaba en el navegador y la base aceptaba todo con la
-- clave pública (anon): cualquiera podía leer los pedidos (nombres, teléfonos,
-- direcciones, deudas), borrarlos o cambiar el menú. Ahora:
--   * El panel entra con Supabase Auth (usuario admin, su contraseña es el PIN).
--   * Solo los correos de la tabla "admins" cuentan como administradores.
--   * Los clientes pueden leer el menú y crear pedidos; nada más.

create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  creado_en timestamptz not null default now()
);
alter table public.admins enable row level security; -- sin políticas: nadie la lee desde la app
insert into public.admins (email) values ('admin@cocinademama.pe') on conflict do nothing;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'authenticated'
     and exists (select 1 from public.admins a where a.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

