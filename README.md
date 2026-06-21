# Cocina de Mamá — Sistema de pedidos del menú diario

App web para que los clientes vean el menú del día y hagan su pedido, y un panel
para administrar pedidos, editar el menú y controlar quién debe.

## Paso 1 — Crear las tablas en Supabase

1. Entra a [supabase.com](https://supabase.com) → tu proyecto (o crea uno nuevo, es gratis).
2. Ve a **SQL Editor** (en el menú lateral) → **New query**.
3. Abre el archivo `supabase_setup.sql` de esta carpeta, copia todo su contenido, pégalo ahí y dale **Run**.
4. Esto crea las tablas `menu` y `orders`, deja un menú de ejemplo cargado, y activa Realtime
   (para que los pedidos aparezcan al instante en el panel sin recargar la página).

## Paso 2 — Obtener tus claves de Supabase

1. En Supabase, ve a **Project Settings** (ícono de engranaje) → **API**.
2. Copia:
   - **Project URL** → la vas a usar como `VITE_SUPABASE_URL`
   - **anon public key** → la vas a usar como `VITE_SUPABASE_ANON_KEY`

(Estas dos son seguras para usar en el frontend, están pensadas para eso.)

## Paso 3 — Probar localmente (opcional)

```bash
npm install
cp .env.example .env.local
# Edita .env.local y pega tus claves de Supabase
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Paso 4 — Subir a GitHub

```bash
git init
git add .
git commit -m "Cocina de Mamá - sistema de pedidos"
```

Crea un repositorio nuevo en GitHub (puede ser privado) y luego:

```bash
git remote add origin https://github.com/TU-USUARIO/cocina-mama.git
git branch -M main
git push -u origin main
```

## Paso 5 — Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Importa el repositorio que acabas de subir a GitHub.
3. En **Environment Variables**, agrega las dos variables del Paso 2:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click en **Deploy**.
5. En 1-2 minutos, Vercel te da una URL pública (algo como `cocina-mama.vercel.app`).

Esa URL es la que compartes por WhatsApp a tus clientes — ya es un link real que se
puede pegar y abrir directo, no código.

## Paso 6 — Usar en la tablet del local

- Abre esa misma URL en la tablet.
- Toca el candado (esquina inferior derecha) para entrar al panel con el PIN.
- El PIN por defecto es `1234` — cámbialo en `src/App.jsx`, busca la línea:
  ```js
  const ADMIN_PIN = "1234";
  ```
  y reemplázalo por el que quieras usar en el local. Luego vuelve a subir el cambio
  a GitHub (`git add .`, `git commit -m "cambio de pin"`, `git push`) y Vercel
  lo actualiza solo.

## Actualizar el menú cada día

Desde el panel (candado → PIN → pestaña "Editar menú"), cambias los 2 platos de
fondo, las 3 entradas y la bebida. En cuanto guardas, **todos los que abran la
página ven el nuevo menú al instante** — no hace falta avisar nada por WhatsApp
de nuevo, el link de siempre ya muestra el menú actualizado.

## Notas importantes

- **No hay envío automático de mensajes por WhatsApp.** Eso requiere la API
  oficial de WhatsApp Business (de pago, con aprobación de Meta). El flujo
  aquí es: tú compartes el link una vez (puede quedar fijado en tu grupo de
  WhatsApp), y los clientes lo abren cuando quieran ver el menú del día.
- **El PIN del panel es solo una traba visual**, no seguridad real a nivel de
  base de datos (cualquiera con las claves de Supabase técnicamente podría
  escribir directo). Para un negocio familiar chico esto es razonable. Si en
  el futuro quieres seguridad más fuerte (login real para tu mamá), se puede
  agregar Supabase Auth.
