// supabase/functions/leer-pedido/index.ts
// Lee un mensaje de WhatsApp y lo convierte en un pedido con los platos del
// menú de hoy, usando Claude Haiku. Solo la puede usar el admin (cuesta
// dinero), y solo funciona si existe el secreto ANTHROPIC_API_KEY. Si no
// hay clave, responde { error: "SIN_IA" } y la app usa su lector local.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MODELO = Deno.env.get("LEER_PEDIDO_MODELO") ?? "claude-haiku-5-5";

type Item = { id: string; nombre: string; proteinas?: string[]; permiteArroz?: boolean; precio?: number };

const HERRAMIENTA = {
  name: "registrar_pedido",
  description: "Registra el pedido que hizo el cliente, usando solo los ids del menú de hoy.",
  input_schema: {
    type: "object",
    properties: {
      nombre: { type: "string", description: "Nombre del cliente si aparece; si no, vacío." },
      menus: {
        type: "array",
        description: "Cada menú es un segundo (plato de fondo). Agrupa los iguales con cantidad.",
        items: {
          type: "object",
          properties: {
            segundoId: { type: "string" },
            proteina: { type: "string", description: "Una de las proteínas de ese segundo, o vacío." },
            entradaId: { type: ["string", "null"], description: "Entrada incluida con este menú, o null." },
            arroz: { type: ["string", "null"], enum: ["con", "sin", null] },
            cantidad: { type: "integer", minimum: 1, maximum: 30 },
          },
          required: ["segundoId", "cantidad"],
        },
      },
      entradasExtra: {
        type: "array",
        description: "Entradas que pidió de más, aparte de las incluidas en cada menú.",
        items: { type: "object", properties: { id: { type: "string" }, cantidad: { type: "integer", minimum: 1 } }, required: ["id", "cantidad"] },
      },
      adicionales: {
        type: "array",
        description: "Bebidas, postres o adicionales con precio.",
        items: { type: "object", properties: { id: { type: "string" }, cantidad: { type: "integer", minimum: 1 } }, required: ["id", "cantidad"] },
      },
      modo: { type: ["string", "null"], enum: ["recojo", "delivery", null] },
      direccion: { type: "string" },
      pago: { type: ["string", "null"], enum: ["yape", "efectivo", "fiado", null] },
      notas: { type: "string", description: "Pedidos especiales: sin cebolla, poca sal, etc." },
      dudas: { type: "array", items: { type: "string" }, description: "Lo que no quedó claro, en español corto." },
    },
    required: ["menus", "entradasExtra", "adicionales", "modo", "pago", "dudas"],
  },
};

function instrucciones(menu: { segundos: Item[]; entradas: Item[]; extras: Item[] }) {
  const lista = (xs: Item[]) =>
    xs
      .map((x) => {
        const extra = [
          x.proteinas?.length ? `proteínas: ${x.proteinas.join(" | ")}` : "",
          x.permiteArroz ? "se puede pedir sin arroz" : "",
          x.precio ? `S/ ${x.precio}` : "",
        ].filter(Boolean);
        return `- id=${x.id} · ${x.nombre}${extra.length ? ` (${extra.join("; ")})` : ""}`;
      })
      .join("\n") || "(ninguno)";
  return `Eres el ayudante de un restaurante familiar de menú en Lima, Perú. Te pasan mensajes de WhatsApp de clientes (a veces varios seguidos, mal escritos, con jerga peruana) y debes registrar el pedido con la herramienta.

Menú de HOY:
SEGUNDOS (plato de fondo; cada uno es un "menú" que incluye una entrada y refresco):
${lista(menu.segundos)}
ENTRADAS:
${lista(menu.entradas)}
EXTRAS (se cobran aparte):
${lista(menu.extras)}

Reglas:
- Usa solo los ids de arriba. Si piden algo que no está hoy, no lo inventes: ponlo en dudas.
- "menú", "almuerzo", "segundo" sin decir cuál: si hay un solo segundo, es ese; si no, duda.
- Cada menú lleva como máximo una entrada incluida. "con sopa/entrada" sin decir cuál: si hay una sola entrada, es esa; si no, duda. Entradas pedidas "aparte" o de más van en entradasExtra.
- Si el segundo tiene proteínas y no dice cuál, deja proteina vacía y ponlo en dudas.
- "para llevar", "paso a recoger" = recojo. "delivery", "mándame", "tráeme", o si da una dirección = delivery. Si no dice, null.
- "yapeo/plin" = yape; "efectivo/sencillo" = efectivo; "apúntame/anótalo/a cuenta/después pago/fin de mes" = fiado. Si no dice, null.
- El refresco ya viene incluido; no lo agregues.
- Saludos y conversación se ignoran.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // Solo el admin (cuesta plata y el mensaje tiene datos de clientes).
  const auth = req.headers.get("Authorization") ?? "";
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: esAdmin } = await supa.rpc("es_admin");
  if (esAdmin !== true) return json({ error: "No autorizado" }, 401);

  const clave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!clave) return json({ error: "SIN_IA" }, 200);

  let body: { texto?: string; menu?: { segundos: Item[]; entradas: Item[]; extras: Item[] } };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const texto = (body.texto ?? "").slice(0, 4000).trim();
  if (!texto || !body.menu) return json({ error: "Falta el mensaje o el menú" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1024,
      system: instrucciones(body.menu),
      tools: [HERRAMIENTA],
      tool_choice: { type: "tool", name: "registrar_pedido" },
      messages: [{ role: "user", content: `Mensaje(s) del cliente:\n"""\n${texto}\n"""` }],
    }),
  });
  if (!r.ok) {
    console.error("Anthropic", r.status, await r.text());
    return json({ error: r.status === 401 ? "CLAVE_INVALIDA" : r.status === 400 ? "SIN_SALDO_O_PEDIDO_INVALIDO" : "IA_NO_DISPONIBLE" }, 200);
  }
  const data = await r.json();
  const uso = data.content?.find((c: { type: string }) => c.type === "tool_use");
  if (!uso) return json({ error: "IA_NO_DISPONIBLE" }, 200);
  return json({ pedido: uso.input, modelo: MODELO });
});
