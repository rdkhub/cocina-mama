// supabase/functions/notificar-pedido/index.ts
//
// Envía una notificación push a los celulares que activaron las
// notificaciones en el panel de admin. Sin librerías externas: el cifrado
// Web Push vive en ./webpush.ts y la base se consulta con fetch.
//
// Usos:
//  - { tipo: "pedido", id }      → la llama la base de datos (trigger +
//    pg_net) cada vez que entra un pedido. Exige el header x-webhook-secret.
//  - { tipo: "prueba", endpoint } → botón "Enviar notificación de prueba".
//    Solo manda a ESE celular, y solo si ya estaba registrado.
//  - { tipo: "clave" }            → devuelve la clave pública VAPID que el
//    navegador necesita para suscribirse.
//
// No usa secretos de la Edge Function: la clave del webhook y las claves
// VAPID viven en Supabase Vault (push_webhook_secret, push_vapid_keys) y se
// leen con funciones que solo puede ejecutar la service role. Si las claves
// VAPID no existen, se generan aquí la primera vez y se guardan en Vault.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen incluidos.

import {
  b64urlEncode,
  type ClavesVapid,
  enviarPush,
  importarVapid,
  type Suscripcion,
  type VapidJwks,
} from "./webpush.ts";

// Contacto para los servicios de push (Google, Mozilla): la web del negocio.
const CONTACTO_VAPID = Deno.env.get("VAPID_SUBJECT") ?? "https://cocina-mama-roan.vercel.app";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------- Acceso a la base (PostgREST con la service role) ----------
async function db(ruta: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${await res.text()}`);
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

type FilaSuscripcion = Suscripcion & { id: string };

type Config = { webhookSecret: string; vapid: VapidJwks };
let configPromise: Promise<Config> | null = null;

async function cargarConfig(): Promise<Config> {
  const datos = (await db("rpc/push_config", { method: "POST", body: "{}" })) as Record<string, string>;
  let vapidTexto = datos.push_vapid_keys;
  if (!vapidTexto) {
    // Primera vez: se generan las claves VAPID y se guardan en Vault.
    const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const nuevas = JSON.stringify({
      publicKey: await crypto.subtle.exportKey("jwk", par.publicKey),
      privateKey: await crypto.subtle.exportKey("jwk", par.privateKey),
    });
    vapidTexto = (await db("rpc/push_guardar_vapid", {
      method: "POST",
      body: JSON.stringify({ p_keys: nuevas }),
    })) as string;
  }
  return { webhookSecret: datos.push_webhook_secret ?? "", vapid: JSON.parse(vapidTexto) };
}

function config() {
  if (!configPromise) {
    configPromise = cargarConfig().catch((e) => {
      configPromise = null; // reintentar en la siguiente llamada
      throw e;
    });
  }
  return configPromise;
}

let clavesPromise: Promise<ClavesVapid> | null = null;
function claves() {
  if (!clavesPromise) {
    clavesPromise = config().then((c) => importarVapid(c.vapid)).catch((e) => {
      clavesPromise = null;
      throw e;
    });
  }
  return clavesPromise;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Comparación en tiempo constante para la clave del webhook.
function iguales(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let r = 0;
  for (let i = 0; i < ea.length; i++) r |= ea[i] ^ eb[i];
  return r === 0;
}

type Mensaje = { title: string; body: string; url: string; tag: string };

async function enviar(subs: FilaSuscripcion[], mensaje: Mensaje) {
  const k = await claves();
  const contacto = CONTACTO_VAPID;
  const texto = JSON.stringify(mensaje);
  let enviadas = 0;
  let eliminadas = 0;
  let fallidas = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        const status = await enviarPush(s, texto, k, contacto);
        if (status >= 200 && status < 300) {
          enviadas++;
          await db(`push_suscripciones?id=eq.${s.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ultimo_envio: new Date().toISOString() }),
          });
        } else if (status === 404 || status === 410) {
          // El celular desinstaló la app o quitó el permiso: se borra.
          eliminadas++;
          await db(`push_suscripciones?id=eq.${s.id}`, { method: "DELETE" });
        } else {
          fallidas++;
          console.error("Push rechazado", status, s.endpoint.slice(0, 60));
        }
      } catch (e) {
        fallidas++;
        console.error("Error enviando push", String(e));
      }
    }),
  );
  return { enviadas, eliminadas, fallidas };
}

// ---------- Texto de la notificación de un pedido ----------
type Item = { nombre?: string; cantidad?: number; proteina?: string; entradaIncluida?: string; arroz?: string; precio?: number };
type Pedido = {
  id: string;
  nombre: string;
  fondos?: Item[];
  entradas?: Item[];
  adicionales?: Item[];
  modo?: string;
  direccion?: string;
  pago?: string;
  notas?: string;
  total?: number | string;
  formato?: number;
};

// Los pedidos de la versión anterior no guardaban el total: se calcula
// igual que lo hacía esa versión.
function totalLegado(o: Pedido) {
  const f = o.fondos ?? [];
  const nf = f.reduce((a, x) => a + (x.cantidad || 0), 0);
  const inc = f.reduce((a, x) => a + (x.entradaIncluida ? x.cantidad || 0 : 0), 0);
  const ne = (o.entradas ?? []).reduce((a, x) => a + (x.cantidad || 0), 0);
  const ad = (o.adicionales ?? []).reduce((a, x) => a + (x.cantidad || 0) * (x.precio || 0), 0);
  return nf * (o.modo === "delivery" ? 13 : 12) + Math.max(0, ne - inc) * 3 + ad;
}

function textoPedido(o: Pedido): Mensaje {
  const total = Number(o.formato) >= 2 ? Number(o.total) : totalLegado(o);
  const fondos = o.fondos ?? [];
  const lineas = fondos.map((f) => {
    let l = `${f.cantidad ?? 1}× ${String(f.nombre ?? "").trim()}`;
    if (f.proteina) l += ` ${f.proteina}`;
    if (f.entradaIncluida) l += ` + ${String(f.entradaIncluida).trim()}`;
    if (f.arroz === "sin") l += " (sin arroz)";
    return l;
  });
  const incluidas = new Map<string, number>();
  fondos.forEach((f) => {
    if (!f.entradaIncluida) return;
    const k = String(f.entradaIncluida).trim();
    incluidas.set(k, (incluidas.get(k) ?? 0) + (f.cantidad ?? 1));
  });
  (o.entradas ?? []).forEach((e) => {
    const k = String(e.nombre ?? "").trim();
    const extra = (e.cantidad ?? 0) - (incluidas.get(k) ?? 0);
    if (extra > 0) lineas.push(`${extra}× ${k} (entrada extra)`);
  });
  (o.adicionales ?? []).forEach((a) => lineas.push(`${a.cantidad ?? 1}× ${a.nombre}`));

  const entrega = o.modo === "delivery" ? `Delivery${o.direccion ? `: ${o.direccion}` : ""}` : "Recojo en local";
  const pago = o.pago === "fiado" ? "Fiado" : o.pago === "yape" ? "Yape" : "Efectivo";
  const notas = o.notas ? `\n📝 ${o.notas}` : "";

  return {
    title: `🛎️ ${o.nombre} · S/ ${total.toFixed(2)}`,
    body: `${lineas.join("\n")}\n${entrega} · ${pago}${notas}`,
    url: `/?pedido=${o.id}`,
    tag: `pedido-${o.id}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: { tipo?: string; id?: string; endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  try {
    if (body.tipo === "clave") {
      const k = await claves();
      return json({ publicKey: b64urlEncode(k.publicaRaw) });
    }

    if (body.tipo === "pedido") {
      const secreto = (await config()).webhookSecret;
      if (!secreto || !iguales(req.headers.get("x-webhook-secret") ?? "", secreto)) {
        return json({ error: "No autorizado" }, 401);
      }
      if (!/^[0-9a-f-]{36}$/i.test(body.id ?? "")) return json({ error: "id inválido" }, 400);
      const [pedido] = (await db(`orders?id=eq.${body.id}&select=*`)) as Pedido[];
      if (!pedido) return json({ error: "Pedido no encontrado" }, 404);

      const subs = (await db("push_suscripciones?select=id,endpoint,p256dh,auth")) as FilaSuscripcion[];
      if (!subs.length) return json({ enviadas: 0, nota: "No hay celulares registrados" });
      return json(await enviar(subs, textoPedido(pedido)));
    }

    if (body.tipo === "prueba") {
      if (!body.endpoint) return json({ error: "Falta endpoint" }, 400);
      const subs = (await db(
        `push_suscripciones?select=id,endpoint,p256dh,auth&endpoint=eq.${encodeURIComponent(body.endpoint)}`,
      )) as FilaSuscripcion[];
      if (!subs.length) return json({ error: "Este celular no tiene las notificaciones activadas" }, 404);
      const r = await enviar(subs, {
        title: "🔔 Prueba de Cocina de Mamá",
        body: "Listo. Así te van a llegar los pedidos nuevos.",
        url: "/?admin=1",
        tag: "prueba",
      });
      return json(r, r.enviadas > 0 ? 200 : 502);
    }

    return json({ error: "Tipo desconocido" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
