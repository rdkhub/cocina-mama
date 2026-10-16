-- Pedidos de la versión nueva (formato 2) llevan el total calculado por la base.
-- Los pedidos de antes quedan con formato 1 y se muestran como siempre.
alter table public.orders add column if not exists formato smallint not null default 1;
