# Cocina de Mamá

App web de pedidos del menú diario de un negocio familiar en La Molina (Lima). Los clientes ven el menú del día y piden; el panel (mamá/papá, en celular o tablet) maneja Cuaderno, pedidos de Hoy, Menú, quién Debe, Historial y Semanal.

## Stack

React 19 + Vite 8 + Tailwind 3 (JavaScript, sin TypeScript).

Supabase: Postgres con RLS, Realtime, Storage (fotos de platos), Auth, Edge Functions y Web Push.

Deploy en Vercel.

## Correrlo en tu computadora

```bash
npm install
npm run demo     # http://localhost:5180 con datos inventados, no toca la base real
npm run dev      # http://localhost:5173, necesita .env.local
npm test
npm run lint
npm run build
```

Para `npm run dev` crea a mano un archivo `.env.local` (no hay `.env.example`) con dos líneas:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

Ese archivo nunca se sube a GitHub: ya está en `.gitignore`.

## Base de datos

- El esquema está en `supabase/migrations/` (se aplican en orden por fecha). El archivo `supabase_setup.sql` es la versión inicial antigua y ya no es la referencia.
- El total de cada pedido lo calcula la base de datos (función `validar_pedido`). La pantalla solo muestra una estimación.
- Edge Functions en `supabase/functions/`: `leer-pedido` (lee un mensaje de pedido con IA, solo para el admin) y `notificar-pedido` (aviso push cuando entra un pedido).

## Panel de administración

- Se entra tocando el candado arriba a la derecha de la página.
- El PIN es la contraseña de un usuario de Supabase Auth (de 6 a 8 dígitos). Se verifica en el servidor; no hay ningún PIN escrito en el código.
- Solo los correos de la tabla `admins` cuentan como administradores (función `es_admin`). Para cambiar el PIN, cambia la contraseña de ese usuario en Supabase → Authentication → Users.

## Deploy

- Vercel despliega solo al hacer push a `main`. Variables en Vercel: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- `main` está en producción: se trabaja en una rama con Pull Request. Antes de subir, `npm run lint`, `npm test` y `npm run build` deben pasar.
- La vista previa de Vercel de cada PR usa la base de datos REAL: los pedidos de prueba llevan «prueba» en el nombre.

## WhatsApp

- El link de la página se comparte por WhatsApp. No hay envío ni lectura automática de WhatsApp (no hay API oficial sin RUC).
- Los pedidos que llegan por WhatsApp se anotan en la pestaña Cuaderno.

## Más información

Detalles para desarrolladores en `CLAUDE.md`; estado y próximos pasos en `PENDIENTES.md`.
