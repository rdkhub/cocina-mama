-- validar_pedido y avisar_pedido_nuevo solo deben ejecutarse como triggers,
-- nunca llamados directo por un cliente (anon/authenticated) vía RPC. Esto
-- no afecta a los triggers: Postgres los ejecuta igual sin importar estos
-- permisos.
revoke all on function public.validar_pedido() from public, anon, authenticated;
revoke all on function public.avisar_pedido_nuevo() from public, anon, authenticated;
