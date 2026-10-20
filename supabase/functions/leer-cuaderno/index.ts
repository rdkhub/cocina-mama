// supabase/functions/leer-cuaderno/index.ts
// Lee la foto de la hoja del cuaderno donde se apuntan los pedidos a mano y
// devuelve la lista de pedidos con los platos del menú de hoy. Solo el admin
// puede usarla y necesita el secreto ANTHROPIC_API_KEY. Lo que devuelve se
// revisa en la app antes de guardar.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// La letra a mano es difícil: se usa un modelo más capaz que para WhatsApp.
const MODELO = Deno.env.get("LEER_CUADERNO_MODELO") ?? "claude-sonnet-5-5";

type Item = { id: string; nombre: string; proteinas?: string[]; permiteArroz?: boolean; precio?: number };

const LINEA = {
  type: "object",
  properties: {
    segundoId: { type: "string" },
    proteina: { type: "string" },
    entradaId: { type: ["string", "null"] },
    arroz: { type: ["string", "null"], enum: ["con", "sin", null] },
    cantidad: { type: "integer", minimum: 1, maximum: 30 },
  },
  required: ["segundoId", "cantidad"],
};
const CANT = { type: "object", properties: { id: { type: "string" }, cantidad: { type: "integer", minimum: 1 } }, required: ["id", "cantidad"] };

const HERRAMIENTA = {
  name: "registrar_cuaderno",
  description: "Registra todos los pedidos escritos en la hoja, en orden de arriba hacia abajo.",
  input_schema: {
    type: "object",
    properties: {
      pedidos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre del cliente tal como está escrito (corregido si hay un nombre tachado y otro al lado)." },
            menus: { type: "array", items: LINEA },
            entradasExtra: { type: "array", items: CANT },
            adicionales: { type: "array", items: CANT },
            notas: { type: "string" },
            tachado: { type: "boolean", description: "true si TODO el renglón está tachado (pedido cancelado)." },
            listo: { type: "boolean", description: "true si el renglón tiene un check ✓ al final." },
            dudas: { type: "array", items: { type: "string" } },
          },
          required: ["nombre", "menus", "tachado", "listo", "dudas"],
        },
      },
      dudasGenerales: { type: "array", items: { type: "string" } },
    },
    required: ["pedidos"],
  },
};

function instrucciones(menu: { segundos: Item[]; entradas: Item[]; extras: Item[] }) {
  const lista = (xs: Item[]) =>
    xs
      .map((x) => `- id=${x.id} · ${x.nombre}${x.proteinas?.length ? ` (proteínas: ${x.proteinas.join(" | ")})` : ""}${x.permiteArroz ? " (se puede sin arroz)" : ""}`)
      .join("\n") || "(ninguno)";
  return `Eres el ayudante de un restaurante familiar de menú en Lima. Te mandan la foto de la hoja del cuaderno donde el papá apunta a mano los pedidos del día. Registra cada renglón con la herramienta.

Menú de HOY:
SEGUNDOS:
${lista(menu.segundos)}
ENTRADAS:
${lista(menu.entradas)}
EXTRAS:
${lista(menu.extras)}

Cómo se escribe en el cuaderno:
- Cada renglón: NOMBRE · cantidad · segundo abreviado / entrada. Ej: "MARCOS 1- ARR / ENSAL" = 1 menú del segundo que empieza con "Arroz" con la entrada que empieza con "Ensalada".
- Abreviaturas: compáralas con el menú de hoy (ARR, OLLUQ, ENSAL, SOPA…). Las letras A a veces se escriben como triángulo (Δ).
- "2 OLLUQ(2) 1 SOPA 1 ENSAL" = 2 menús de ese segundo, uno con sopa y otro con ensalada. "2 ARR(1) OLLUQ(1)" = 1 de cada segundo. El número entre paréntesis es cuántos de ese plato.
- "1 sin arroz" = uno de esos menús sin arroz.
- "+ 1 olluq / sopa" escrito después = se agregó un menú más al mismo cliente.
- Si el nombre está tachado y hay otro nombre escrito al lado o encima, usa el que no está tachado. Si TODO el renglón está tachado, marca tachado=true.
- Un check (✓) al final = el pedido ya está listo para enviar → listo=true.
- Si un renglón solo dice el segundo sin entrada, entradaId = null.
- Usa solo ids del menú de hoy. Si algo no se entiende, ponlo en dudas de ese pedido; no inventes nombres ni platos. Si un nombre es difícil de leer, escribe tu mejor lectura y agrega una duda.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: esAdmin } = await supa.rpc("es_admin");
  if (esAdmin !== true) return json({ error: "No autorizado" }, 401);

  const clave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!clave) return json({ error: "SIN_IA" }, 200);

  let body: { imagen?: string; tipo?: string; menu?: { segundos: Item[]; entradas: Item[]; extras: Item[] } };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const imagen = (body.imagen ?? "").replace(/^data:[^,]+,/, "");
  const tipo = ["image/jpeg", "image/png", "image/webp"].includes(body.tipo ?? "") ? body.tipo : "image/jpeg";
  if (!imagen || imagen.length > 6_000_000 || !body.menu) return json({ error: "Falta la foto o el menú" }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 4096,
      system: instrucciones(body.menu),
      tools: [HERRAMIENTA],
      tool_choice: { type: "tool", name: "registrar_cuaderno" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: tipo, data: imagen } },
            { type: "text", text: "Esta es la hoja de pedidos de hoy. Registra todos los renglones." },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    console.error("Anthropic", r.status, await r.text());
    return json({ error: r.status === 401 ? "CLAVE_INVALIDA" : r.status === 400 ? "SIN_SALDO_O_FOTO_INVALIDA" : "IA_NO_DISPONIBLE" }, 200);
  }
  const data = await r.json();
  const uso = data.content?.find((c: { type: string }) => c.type === "tool_use");
  if (!uso) return json({ error: "IA_NO_DISPONIBLE" }, 200);
  return json({ ...uso.input, modelo: MODELO });
});
