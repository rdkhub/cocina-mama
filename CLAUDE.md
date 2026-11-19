# Cocina de Mamá

App web de pedidos del menú diario de un negocio familiar: los clientes ven el menú del día y piden; el panel de administración (mamá/papá, en una tablet) gestiona pedidos, platos, menú del día, proteínas, quién debe e historial. El link se comparte por WhatsApp. Reglas generales en `../CLAUDE.md`.

## Stack

- React 19 + Vite 8 + Tailwind 3, JavaScript (sin TypeScript), lucide-react.
- Supabase: Postgres con RLS, Realtime, Storage (fotos de platos), Auth (un usuario admin; el "PIN" es su contraseña), Edge Functions (`leer-pedido`, `notificar-pedido`), Web Push.
- Deploy en Vercel (variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Correrlo

```bash
npm install
npm run dev      # http://localhost:5173, necesita .env.local con las dos variables VITE_SUPABASE_*
npm run build
npm run lint
```

No hay tests.

## Estructura

```
src/
  App.jsx, main.jsx, supabaseClient.js
  context/AppContext.jsx   estado global, carga inicial y Realtime
  components/
    client/                vista del cliente (menú, resumen, confirmación)
    admin/                 panel: AdminView, PinScreen, OrderCard, NuevoPedidoSheet, CompartirMenu, tabs/
    ui/                    componentes chicos reutilizables (Sheet, Toast, Switch, Tag…)
  lib/                     auth (admin), catálogo, imagen del menú (canvas), push, leer pedido (texto → pedido)
  utils/                   pedidos, contacto, avisos
  data.js                  acceso a pedidos
supabase/
  migrations/              esquema, RLS, storage, push (Vault), seguridad admin
  functions/               leer-pedido, notificar-pedido
supabase_setup.sql         setup inicial antiguo (las migraciones son la fuente actual)
```

## Pendientes / estado al 18-nov-2026

- `npm run build` pasa (aviso: bundle de 543 kB, se podría partir).
- `npm run lint` falla con 38 errores: `React` importado sin usar, `setState` dentro de `useEffect` en `AppContext.jsx`, archivos que exportan componentes y funciones a la vez (`react-refresh/only-export-components`).
- No hay tests: candidatos claros son `src/lib/leerPedidoLocal.js` y `src/utils/pedidos.js`.
- El README está desactualizado: habla de `ADMIN_PIN = "1234"` en `App.jsx` (ya no existe; ahora es Supabase Auth en `src/lib/auth.js`) y de un `.env.example` que no está en el repo.
- Los datos de pedidos son de clientes reales: nunca pasarlos a OpenCode ni a servicios externos.
