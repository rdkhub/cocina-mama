-- Foto opcional por proteína: { "Pollo a la plancha": { "url": "...", "path": "..." }, ... }
-- La clave es el nombre de la proteína tal como está en la tabla proteinas.
alter table public.platos
  add column if not exists fotos_proteina jsonb not null default '{}'::jsonb;

alter table public.platos
  drop constraint if exists platos_fotos_proteina_objeto;
alter table public.platos
  add constraint platos_fotos_proteina_objeto check (jsonb_typeof(fotos_proteina) = 'object');
