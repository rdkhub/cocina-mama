# PENDIENTES — Cocina de Mamá

Última actualización: 21-nov-2026 (sesión del 21 de noviembre, después del cierre del 18 al 21).

---

## 1. Dónde estamos

- **En producción** (`main`, desplegado en Vercel): PR #9 a #20 fusionados. Último commit de código en `main`: `b47a229` (merge del PR #20, "En casa" y Deben por semana). Migraciones `adicionales_fijos` y `modo_en_casa` aplicadas en Supabase.

### Sesión del 21-nov (noche): "En casa", Deben por semana y seguridad
- **Adicionales creados en producción** (Platos, categoría Adicional): Presa extra S/ 6, Plancha extra S/ 6, Bistec extra S/ 6, Huevo sancochado S/ 1.
- **PR #20 (fusionado):** modo **"En casa"** (come aquí) en el Cuaderno, a `menu_dia.precio_casa` (S/ 11 por defecto, editable en Precios de hoy); entrada extra y adicionales igual. **Deben** agrupado por semana (lunes a domingo) y por cliente, desplegable, con pedidos día por día, cuántos pedidos y menús, y "Pagó toda la semana".
- **Migración `modo_en_casa`** (`20261121130000_modo_en_casa.sql`, en Supabase `20261121210156`): columna `precio_casa` (31 días quedaron en S/ 11); `validar_pedido` solo acepta recojo/delivery/casa y **"casa" solo el admin**. Probada con transacción que se deshizo sola: sin admin → rechazado; modo inventado → rechazado; como admin, 3 menús → S/ 33.
- **Pedidos de Vania (se le cobra S/ 11 por plato):** el del 21-nov pasado a "En casa": S/ 36 → S/ 33 (sigue "Debe"). El del 19-nov figuraba pagado con Yape, pero no lo pagó: pasado a "Debe" y "En casa", S/ 36 → S/ 33. En Deben sale con 2 pedidos, 6 menús, S/ 66 en la semana del 16 – 22 nov.
- **Revisión de seguridad:** sin PIN no se lee nada (prueba real desde afuera: pedidos, admins y suscripciones vacíos; `es_admin` = false; PIN falso rechazado). RLS activo en todas las tablas; solo el admin lee/edita/borra pedidos. Sin `.env`, claves, tokens ni PIN en el repo ni en el historial; el bundle solo trae la clave publishable. Hay 1 usuario en Auth y es el admin.
- **Recomendaciones de seguridad pendientes** (no se cambiaron): en Supabase → Authentication apagar "Allow new users to sign up" y activar "Leaked password protection"; PIN de 8 dígitos; `quitar_suscripcion` no revisa `es_admin` (riesgo bajo, se arregla con una migración chica).
- **PR abiertos:**
  - **#8 `feature/foto-cuaderno`** (20-oct): leer con IA una foto de la hoja del cuaderno. **Tiene conflictos con `main`.** Falta tu decisión (ver el paso 5 de la sección 3).
- **Ramas viejas sin borrar** (no se borran sin tu permiso): `docs/claude-md` y `fix/numeracion-pasos`, ya fusionadas.
- **Proyecto "lector automático de WhatsApp" (fase B): DESCARTADO por ahora.** No hay forma oficial y gratis sin RUC (ver la sección 2.1). La fase 1 (compartir mensajes a la app y leerlos con IA o con el lector local) sigue funcionando.

### Sesión del 21-nov
- **PR #15 (fusionado):** la numeración de pasos saltaba del 2 al 4 cuando había entrada extra pero no extras. Ahora el paso 3 y el número de "Tus datos" dependen de la misma condición (`hayPasoExtras` en `ClientView.jsx`).
- **PR #16 (fusionado):** candado, WhatsApp de arriba y "Copiar" con área de toque de 44 px o más (un `::after` invisible, se ven igual); la fecha y el menú de la tarjeta de precios ya no se parten a la mitad; el aviso de horario de Encuéntranos entra en una línea.
- **PR #17 (fusionado):** README reescrito por OpenCode y revisado (ya no habla de `ADMIN_PIN` ni de `.env.example`).

### Sesión del 21-nov (tarde): Cuaderno más claro para el papá
Pedido de Rodrigo (urgente: corregir pedidos).
- **Corregir cualquier pedido de hoy**, de la página, de WhatsApp o a mano: se toca en la lista del Cuaderno o con el botón **"Corregir"** de cada tarjeta en Hoy. Antes los de la página no se podían tocar.
- **Arreglos al corregir:** ya no se borran las notas, el teléfono ni el mensaje original de WhatsApp; y un plato o entrada que se agotó después ya no desaparece del pedido (el Cuaderno usa el menú con lo agotado: `contextoDelMenu(..., { conAgotados: true })`).
- **Armar un plato a la vez:** se toca el plato, se elige cuántos, entrada, proteína y arroz, y **"Agregar al pedido"**. Queda en "Este pedido lleva" con su detalle ("2 × Lomo · con sopa") y su precio, con lápiz para cambiarlo y tacho para quitarlo. Otro igual pero distinto se arma aparte. Se quitó "Separar uno" y "+ Otro diferente".
- **Notas** en el Cuaderno (otro plato que no está, "sin cebolla"…). Se ven en la lista y en Hoy.
- **Adicionales fijos:** platos de categoría **Adicional**, activos y con precio (ej. presa extra S/ 6, plancha extra, bistec extra, huevo sancochado) salen siempre en el Cuaderno, aunque no estén en el menú del día. **Hay que crearlos en Platos** (en producción hoy solo existe "Alitas", con precio 0, que no sale).
- **Hoy:** los pendientes arriba ("faltan N") y los listos abajo, en "Listos". **"Para la cocina" empieza en "Falta servir"**: al marcar listo, sus platos se descuentan.
- Migración `20261121120000_adicionales_fijos.sql`: `validar_pedido` acepta esos adicionales sin estar en el menú del día. Producción coincidía con el repo antes de escribirla. **Aplicada el 21-nov** (en Supabase figura como `20261121204636 adicionales_fijos`) y probada con una transacción que se deshizo sola sobre un pedido real: mismo contenido → mismo total (39); 2 adicionales fijos de S/ 6 → 51; un adicional con precio 0 y un postre fuera del menú siguen dando "AGOTADO". Siguen igual `security definer`, `search_path` y permisos. No se probó crear un pedido nuevo (dispararía el aviso push); el camino es el mismo.
- PR #18 fusionado y desplegado.
- 15 tests nuevos (`src/lib/__tests__/cuadernoLineas.test.js`, escritos por OpenCode y revisados). **Total: 72.**
- **PR #8 revisado:** tiene conflictos (toca `AdminView`, `PedidosTab`, `AppContext`, `leerPedido`). Su función `leer-cuaderno` **ya está desplegada en Supabase** aunque el código no está en `main`; solo la puede usar el admin (`es_admin`), así que no hay riesgo de gasto por terceros.

---

## 2. Qué hicimos en esta sesión (en orden)

### 2.1 Investigación: que los mensajes de WhatsApp entren solos (fase A, sin código)
- **Coexistence** (API oficial de WhatsApp con el mismo número y la app Business del papá): funciona en Perú. Recibir mensajes por webhook cuesta $0 en Meta y no hay mensualidad de la API. Pero hace falta un **Tech Provider o un BSP** (proveedor).
- **Ser Tech Provider propio:** exige verificar el negocio con Meta, y para eso hace falta RUC.
- **YCloud (plan Free, $0):** su guía de Coexistence exige "Business Verification" → **sin RUC no se puede**.
- **Kapso:** no pide verificación, pero con 50–60 pedidos al día haría falta el plan Pro → $25/mes. **Rechazado: muy caro.**
- **Dualhook:** $12/mes, webhooks directo de Meta. **Rechazado: muy caro.**
- **App Android que lee las notificaciones:** gratis pero no es la API oficial, pierde audios y fotos, y Android la cierra. **No se hizo.**
- **Decisión:** no hay lector automático. El negocio **no tiene RUC** y no se paga un BSP.
- **Costo estimado de la IA** (Claude Haiku 5.5, que ya usa la función `leer-pedido`): unos $2–5 al mes si algún día se activa la lectura automática.

### 2.2 PR #10: Cuaderno (pestaña nueva del panel)
- Planilla donde el papá anota cada pedido. **Se registra solo como pedido real**: aparece en Hoy, Deben, Historial y Semanal, con Realtime en todos los celulares.
- Archivos: `src/components/admin/tabs/CuadernoTab.jsx`, `src/lib/cuaderno.js`, `src/context/AppContext.jsx` (`editarPedidoAdmin`), `src/data.js` (`updateOrderContenido`) y `src/utils/pedidos.js` (`calcularTotalDia`).
- **Migración** `supabase/migrations/20261118120000_pedidos_editar_contenido.sql`: `validar_pedido` también corre al editar platos o modo (trigger `orders_revalidar_pedido`). Al editar no revisa "agotado". **Ya aplicada en producción** (18-nov) y verificada con una prueba que se deshizo sola.
- Vitest agregado (`npm test`), más `npm run demo` (Supabase falso con datos inventados: `demo/supabaseFalso.js` y `vite.config.demo.js`).

### 2.3 Firma de Claude
- Por pedido tuyo, se quitó "Generated with/by Claude Code" de las descripciones de los PR #1 a #10.
- Los commits viejos con `Co-Authored-By: Claude` se **dejaron** (11 commits). Decidiste no reescribir la historia con force push.
- **Regla desde entonces:** ningún commit ni PR lleva firma de Claude.

### 2.4 PR #11: pulido visual
- **Cliente:**
  - primero el plato, y la entrada, la proteína y el arroz dentro de la tarjeta;
  - barra fija con el total y "Enviar pedido" (si quedó un plato elegido sin agregar, se agrega solo);
  - los errores llevan al campo que falta;
  - **el pago ya no viene marcado en "Fiado"**;
  - agotados en gris con "Agotado hoy";
  - confeti al confirmar.
- **Panel:** barra de pestañas abajo (Cuaderno, Hoy, Menú, Deben, Más). La pestaña Menú quedó en dos partes: "Hoy en el menú", que se ordena arrastrando y guarda `menu_dia_items.orden`, y el catálogo abajo. Los precios quedaron en una línea con "Editar".
- **Librerías:** `motion` (con LazyMotion), `sonner` (avisos), `vaul` (paneles que se arrastran), `@dnd-kit/*` y `canvas-confetti`.
- **Rendimiento:** el panel se carga aparte (`React.lazy`) y `Sheet` (vaul) se importa directo de `ui/Sheet` para que no entre al JS del cliente.
- **Lint:** pasó de 38 errores a **0**.

### 2.5 Impeccable y Playwright
- **Impeccable** (`pbakaus/impeccable`, Apache-2.0) instalado para el proyecto en `.claude/skills/impeccable` y `.claude/agents/`. Los hooks están en `.claude/settings.local.json`, que no se sube.
  - ESLint ignora `.claude/`.
  - `.gitattributes` mantiene el lanzador con saltos de línea LF.
- **Playwright MCP:** ya estaba configurado globalmente en `~/.claude.json` (`cmd /c npx @playwright/mcp@latest`, versión 0.0.86). Funciona.

### 2.6 PR #12: marca de Mamá
- **Avatar** de la mamá hecho en **Higgsfield con Nano Banana**, en 3 poses: saluda (con la olla), celebra y cucharón.
  - Están en `public/mama/` sin fondo ni marca de agua, más versiones `-chica` de 220 px.
  - Scripts para quitar el fondo: en el scratchpad de la sesión, no en el repo.
- **Encuéntranos:** dirección, horario, aviso en vivo de abierto/cerrado (`src/utils/horario.js`, hora de Lima), WhatsApp con botón copiar, "Cómo llegar" y mapa al tocar.
- **Vista previa del link:** `public/og-cocina-de-mama.jpg` (1200×630).
- **Letras propias:** Young Serif (títulos) y Figtree (texto) en `public/fonts/`. Reemplazan a Fraunces e Inter, que Impeccable marca como sobreusadas.
- **Contraste:** ocre más oscuro (`#86672E`), textos de ejemplo de los campos (`#7D6F58`) y botón copiar.

### 2.7 PR #13: portada animada (estilo de la web de Pollería Don Andrés)
- **Referencia:** la web de Walter Rojas (`polleria-don-andres.pages.dev`). Se estudió su código: intro, mascota que acompaña al bajar y saltos.
- **Portada:**
  - pared de **azulejos de cocina** (`public/azulejo.svg`, diseño propio; lo elegiste tú);
  - letrero "Cocina de Mamá" en 3D (Lilita One) que cae y golpea la pared, con temblor y vapor;
  - eslogan "Almuerzos caseros / hechos por Mamá".
- **Mamá viva** (`src/lib/mamaGuia.js`):
  - sube desde detrás del letrero, respira y salta;
  - **una Mamá chiquita acompaña al bajar** de parada en parada (`data-mama`): junto a los títulos, **asomada en "Elige tu plato"** y al final sobre los botones de Encuéntranos;
  - salta a los botones que tocas y **lleva el plato a la bolsa** al agregarlo.
- **Correcciones:** borde blanco del avatar, botón de WhatsApp tapado en computadora y dirección (referencia del taller y coordenadas).
- **Movimiento reducido:** si el sistema lo pide, todo queda quieto. La clase `forzar-movimiento` en `<html>` es solo para pruebas.

### 2.8 PR #14: cuaderno con botones y "Para la cocina"
- **Cuaderno:**
  - se toca el plato y se agrega; si ya está, suma 1;
  - cada tarjeta tiene **− / +** (en 1, un tacho), y entrada, proteína y arroz con botones;
  - "Separar uno" y "+ Otro diferente" para variantes;
  - extras con + / −;
  - "Escribir rápido" se convierte en botones;
  - corregir carga el pedido en los botones.
- **Hoy:** cuadro **"Para la cocina"** con cuántos de cada plato (con proteínas y "sin arroz"), entradas y extras, **sin nombres**.
  - "Todo el día" o "Falta servir";
  - botones WhatsApp y Copiar;
  - no cuenta los pedidos de prueba.
- 16 tests nuevos (`src/lib/__tests__/cuadernoBotones.test.js`), escritos por OpenCode y revisados. **Total: 57 tests.**

---

## 3. Próximos pasos (en orden)

1. **Seguridad de Supabase Auth** (lo hace Rodrigo en el panel de Supabase): apagar registros nuevos, activar protección de contraseñas filtradas y subir el PIN a 8 dígitos. Opcional: migración para que `quitar_suscripcion` revise `es_admin`.
2. **Probar en un celular real** lo que no se pudo probar aquí:
   - intro y Mamá en movimiento;
   - vibración;
   - arrastrar para ordenar el menú;
   - paneles que se cierran arrastrando;
   - cuaderno con botones y cuadro de cocina en el celular del papá;
   - que los botones del PR #16 se toquen bien con el dedo.
3. **Ver la vista previa del link en WhatsApp.** Si sale el ícono viejo, compartir `https://cocina-mama-roan.vercel.app/?v=2`.
4. **Revisar el pin del mapa** (Taller de motos Garro) y confirmar que "Cómo llegar" lleva a la casa.
5. **Decidir qué hacer con el PR #8 (foto del cuaderno)**, que tiene conflictos:
   - rehacerlo sobre el código actual (la función `leer-cuaderno` ya está desplegada),
   - o cerrarlo, porque el cuaderno con botones ya cubre buena parte de la necesidad. Si se cierra, conviene borrar también la función `leer-cuaderno` de Supabase.
6. ~~Actualizar el README~~: hecho en el PR #17.
7. **(Opcional) Pose "durmiendo"** para "Hoy no hay menú" o cerrado. Faltó porque se acabó el saldo de Higgsfield. Ahora se usa la pose del cucharón.
8. **(Opcional) Partir el JS del cliente:** pesa 608 kB (182 kB gzip) por Supabase, motion y sonner.

---

## 4. Problemas abiertos y cosas prometidas

- **Esta computadora tiene apagados los "Efectos de animación" de Windows.** Chrome avisa "reducir movimiento" y la app (igual que la web de la pollería) se muestra quieta. Para verla moverse: *Configuración → Accesibilidad → Efectos visuales → Efectos de animación*.
- **La vista previa de Vercel de cada PR es privada:** pide entrar con tu cuenta de Vercel y usa la **base de datos real**. Los pedidos de prueba van con "PRUEBA" en el nombre.
- **PR #8 con conflictos** y su función `leer-cuaderno` desplegada sin que el código esté en `main`.
- **Impeccable** marca dos cosas que se dejaron **a propósito**: el fondo crema (identidad de la app) y la sombra "mecánica" de los botones (`btn-cta`).
- **No probado en un celular real:** todo lo del punto 3.2.

---

## 5. Datos que diste (para no volver a preguntarlos)

- **Horario:** lunes a sábado, 12:00 p. m. a 4:00 p. m. Domingo cerrado.
- **Dirección:** Calle Pongo de Rentema, Mz. A, Lt. 18, Las Lomas de La Molina Vieja, La Molina. **A una casa del Taller de motos Garro**, junto al Parque Coop. Constructores N.º 2. Coordenadas del taller: `-12.1061397, -76.9349552`.
- **WhatsApp del negocio** (el del papá): 998 869 843 (`51998869843`).
- **El negocio no tiene RUC** (familiar, no formalizado).
- **Volumen:** unos 50 a 60 pedidos al día.
- **Presupuesto:** nada de servicios pagados para WhatsApp; $12–25 al mes ya es "muy caro".
- **WhatsApp:** **no** quieres pedidos "por la app vía WhatsApp". La app y WhatsApp son canales separados: el que pide por la app pide por la app (y llega notificación), y el que pide por WhatsApp se anota en el Cuaderno.
- **Los clientes no usan mucho la app** (mandan audios), por eso el Cuaderno es la herramienta principal del papá.
- **Cocina:** solo importa **cuántos de cada plato**, no de quién es. Eso lo ve el que arma el pedido.
- **Diseño:** te gusta el estilo de la web de Pollería Don Andrés (intro con la marca, mascota chica que se mueve y acompaña al bajar). Fondo: **azulejos de cocina**. Avatar de la mamá con sombrero de paja, mandil crema con corazón y cucharón.
- **Herramientas:** Higgsfield para imágenes (modelo **Nano Banana**; GPT Image para logos con texto). Prompts usados: personaje Pixar-like, "same character, same outfit", fondo blanco liso.
- **Forma de trabajar:**
  - **avísame antes de hacer cambios**;
  - todo en rama + PR, y merge solo con tu OK;
  - **sin firma de Claude** en commits ni PR.
