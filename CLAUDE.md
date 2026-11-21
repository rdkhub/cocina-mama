# Cocina de Mamá

App web de pedidos del menú diario de un negocio familiar en La Molina (Lima): los clientes ven el menú del día y piden; el panel de administración (mamá/papá, en el celular o una tablet) gestiona el Cuaderno de pedidos, pedidos de hoy, menú del día, platos, quién debe, historial y resumen semanal. El link se comparte por WhatsApp. Reglas generales en `../CLAUDE.md`. Estado actual y próximos pasos en `PENDIENTES.md`.

## Stack

- React 19 + Vite 8 + Tailwind 3, JavaScript (sin TypeScript), lucide-react.
- UI: `motion` (siempre con `LazyMotion` + `m.*`, nunca `motion.*` ni `layout`/`layoutId`), `sonner` (avisos: `avisar()`), `vaul` (`ui/Sheet`, importar directo de `ui/Sheet`, no del barril, para que no entre al JS del cliente), `@dnd-kit` (ordenar el menú), `canvas-confetti` (se carga solo al confirmar).
- Supabase: Postgres con RLS, Realtime, Storage (fotos de platos), Auth (un usuario admin; el "PIN" es su contraseña), Edge Functions (`leer-pedido`, `notificar-pedido`), Web Push.
- Deploy en Vercel (variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Un push a `main` es un deploy.

## Correrlo

```bash
npm install
npm run dev      # http://localhost:5173, necesita .env.local con las dos variables VITE_SUPABASE_*
npm run demo     # http://localhost:5180 con un Supabase FALSO y datos inventados (demo/supabaseFalso.js); no toca la base real
npm test         # vitest
npm run lint     # debe quedar en 0 errores
npm run build
```

## Estructura

```
src/
  App.jsx, main.jsx, supabaseClient.js
  context/AppContext.jsx   estado global, carga inicial, Realtime, crear/editar pedidos del admin
  components/
    client/                portada animada (MenuHero), tarjetas, resumen, confirmación, Encuéntranos, EstadoLocal
    admin/                 AdminView (barra de pestañas abajo), PinScreen, OrderCard, NuevoPedidoSheet, ResumenCocina, tabs/
    ui/                    componentes chicos (Sheet = vaul, Toast/avisar = sonner, vibrar, Switch, Tag…)
  lib/                     auth, catálogo, cuaderno (lógica del Cuaderno y conteo de cocina), leerPedido/leerPedidoLocal, mamaGuia (Mamá animada), push, imagen del menú
  utils/                   pedidos (precios y totales), contacto (WhatsApp, dirección, mapa), horario (abierto/cerrado)
  data.js                  acceso a pedidos
demo/                      Supabase falso para `npm run demo`
public/                    mama/ (avatar), fonts/ (letras propias), azulejo.svg, og-cocina-de-mama.jpg
supabase/
  migrations/              esquema, RLS, storage, push (Vault), seguridad admin, editar pedidos
  functions/               leer-pedido (Claude Haiku), notificar-pedido
.claude/                   skill y agentes de Impeccable (diseño); settings.local.json NO se sube
```

## Reglas del negocio (valen siempre)

- **Horario:** lunes a sábado, 12:00 p. m. – 4:00 p. m.; domingo cerrado. Está en `src/utils/horario.js` (se calcula con la hora de Lima).
- **Dirección:** Calle Pongo de Rentema, Mz. A, Lt. 18, Las Lomas de La Molina Vieja, La Molina; a una casa del Taller de motos Garro. El mapa usa las coordenadas del taller (`-12.1061397,-76.9349552`). Todo en `src/utils/contacto.js`.
- **WhatsApp del negocio:** 998 869 843 (`WHATSAPP_NUMBER` en `src/utils/contacto.js`).
- **El total lo calcula SIEMPRE la base de datos** (`validar_pedido`, al crear y al editar platos o modo). La pantalla solo muestra una estimación con la misma cuenta (`calcularTotalDia` / `totalCarrito`). Nunca guardar un total calculado en el navegador.
- **El cliente elige la forma de pago**: no viene marcada por defecto (antes venía "Fiado" y era un error).
- **Pedidos de prueba:** llevan "prueba" en el nombre; no cuentan en reportes ni en "Para la cocina".
- **Cocina:** al que cocina solo le importa cuántos de cada plato (cuadro "Para la cocina" en Hoy), no de quién es.
- **WhatsApp:** el negocio NO tiene RUC, así que no hay API oficial de WhatsApp (Coexistence pide verificar el negocio) y no se paga un proveedor (BSP). La app y WhatsApp son canales separados: los pedidos de WhatsApp se anotan en el Cuaderno o se comparten a la app (fase 1). **Prohibido** usar librerías no oficiales que se conecten al número (Baileys, whatsapp-web.js, wppconnect…).

## Diseño (no cambiar sin pedirlo)

- Paleta en `tailwind.config.js`: crema, terracota, salvia, ocre (`#86672E`, oscurecido por contraste), tinta. Texto gris mínimo `#7D6F58` (4.5:1).
- Letras propias en `public/fonts/`: **Young Serif** (títulos, `.font-display`), **Figtree** (texto y precios con números de ancho fijo), **Lilita One** (solo el letrero "Cocina de Mamá" y el eslogan).
- Portada: pared de **azulejos de cocina** (`public/azulejo.svg`, diseño propio), letrero 3D que cae, Mamá que sube desde el letrero. Inspirada en la web de Pollería Don Andrés, con identidad propia.
- **Avatar de Mamá** (`public/mama/`): 3 poses (saluda, celebra, cucharón) + versiones `-chica`. Hechas en Higgsfield (Nano Banana), sin fondo. La Mamá animada está en `src/lib/mamaGuia.js`; sus paradas se marcan con `data-mama="texto|arriba|asoma|final"` y `mamaLleva()` la hace llevar un plato a la bolsa.
- Respetar **`prefers-reduced-motion`**: con esa opción todo queda quieto. La clase `forzar-movimiento` en `<html>` es solo para probar en una PC con las animaciones de Windows apagadas (como la de Rodrigo).
- Impeccable marca el fondo crema y la sombra "mecánica" de `btn-cta`: se dejaron **a propósito**.

## Forma de trabajar en este repo

- Está en producción: rama + Pull Request; **merge solo con el OK de Rodrigo**; avisarle antes de hacer cambios.
- **Sin firma de Claude**: ni `Co-Authored-By: Claude` en commits ni "Generated with Claude Code" en PRs.
- Probar con `npm run demo` (datos inventados) en tamaño celular antes de subir; la vista previa de Vercel de cada PR es privada y usa la base REAL.
- Migraciones: archivo en `supabase/migrations/` + aplicar con el MCP de Supabase (proyecto `kdgtddqxwrjhyudixqaf`) después de revisar que la función en producción coincide con la del repo.
- Los datos de pedidos son de clientes reales: nunca pasarlos a OpenCode ni a servicios externos. A OpenCode solo tests, docs o mensajes de prueba con datos inventados (`src/lib/__tests__/menuDePrueba.js`).

## Pendientes conocidos

Ver `PENDIENTES.md`. En corto: decidir qué hacer con el PR #8 (foto del cuaderno, con conflictos) y falta probar todo en un celular real.
