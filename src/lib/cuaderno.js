// src/lib/cuaderno.js
// Lógica del "Cuaderno": el papá anota cada pedido en una fila (cliente +
// lo que pidió, escrito como en su cuaderno) y la app lo convierte en un
// pedido de verdad con los platos del menú de hoy. Todo es local y gratis:
// usa el mismo lector que los mensajes de WhatsApp, sin IA.
//
// El texto de la fila es la única fuente: los botones de la pantalla
// ("+ Ají de gallina", "con pollo") solo agregan palabras al texto. Así lo
// que queda guardado (mensaje_original) siempre se puede volver a leer.
// No usa leerPedido.js (que llama a Supabase): el lector local ya devuelve
// solo ids del menú de hoy.
import { leerPedidoLocal } from "./leerPedidoLocal";
import { calcularTotalDia } from "../utils/pedidos";

// Menús / entradas / adicionales del lector → líneas tal como se guardan en
// la tabla "orders" (mismo formato que los pedidos de la página).
export function armarLineas({ menus = [], entradasExtra = [], adicionales = [] }, ctx) {
  const segPorId = new Map(ctx.segundos.map((s) => [s.id, s]));
  const entPorId = new Map(ctx.entradas.map((s) => [s.id, s]));
  const extPorId = new Map(ctx.extras.map((s) => [s.id, s]));

  const porCombo = new Map();
  menus
    .filter((m) => segPorId.has(m.segundoId))
    .forEach((m) => {
      const clave = `${m.segundoId}|${m.proteina || ""}|${m.arroz || ""}|${m.entradaId || ""}`;
      const prev = porCombo.get(clave);
      if (prev) prev.cantidad += m.cantidad;
      else porCombo.set(clave, { ...m });
    });
  const fondos = Array.from(porCombo.values()).map((m) => ({
    platoId: m.segundoId,
    nombre: segPorId.get(m.segundoId).nombre,
    cantidad: m.cantidad,
    ...(m.proteina ? { proteina: m.proteina } : {}),
    ...(m.arroz ? { arroz: m.arroz } : {}),
    ...(m.entradaId && entPorId.has(m.entradaId) ? { entradaId: m.entradaId, entradaIncluida: entPorId.get(m.entradaId).nombre } : {}),
  }));

  const conteoEnt = new Map();
  menus.forEach((m) => m.entradaId && entPorId.has(m.entradaId) && conteoEnt.set(m.entradaId, (conteoEnt.get(m.entradaId) || 0) + m.cantidad));
  entradasExtra.filter((e) => entPorId.has(e.id)).forEach((e) => conteoEnt.set(e.id, (conteoEnt.get(e.id) || 0) + e.cantidad));
  const entradas = Array.from(conteoEnt, ([id, cantidad]) => ({ platoId: id, nombre: entPorId.get(id).nombre, cantidad }));

  const conteoExt = new Map();
  adicionales.filter((a) => extPorId.has(a.id)).forEach((a) => conteoExt.set(a.id, (conteoExt.get(a.id) || 0) + a.cantidad));
  const adic = Array.from(conteoExt, ([id, cantidad]) => ({ platoId: id, nombre: extPorId.get(id).nombre, cantidad, precio: extPorId.get(id).precio }));

  return { fondos, entradas, adicionales: adic };
}

// Atajos que el papá escribe en el cuaderno y que el lector de WhatsApp no
// conoce ("debe", "llevar", "efect").
function modoDelCuaderno(t) {
  if (/\b(delivery|deli|delibery|enviar|mandar)\b/.test(t)) return "delivery";
  if (/\b(llevar|recoge|recojo|local)\b/.test(t)) return "recojo";
  return null;
}
function pagoDelCuaderno(t) {
  if (/\b(debe|fiado|fiao|cuenta|apuntar|anotar)\b/.test(t)) return "fiado";
  if (/\b(yape|yapeo|yapeado|plin)\b/.test(t)) return "yape";
  if (/\b(efectivo|efect|cash|pagado|pago al toque|ya pago)\b/.test(t)) return "efectivo";
  return null;
}
const sinTildes = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Dudas que la pantalla resuelve con botones (no hace falta mostrarlas como texto).
const RESUELTA_CON_BOTON = /^(Falta la proteína|Pidió entrada pero no dice cuál|Es delivery pero no encontré la dirección)/;

// Lee una fila del cuaderno.
//  texto: lo que pidió ("2 aji pollo, 1 sopa, delivery, yape")
//  elegido: lo que se tocó en pantalla { modo, pago } (manda sobre el texto)
export function interpretarFila(texto, ctx, dia, elegido = {}) {
  const r = leerPedidoLocal(texto || "", ctx);
  const t = sinTildes(texto);
  const modo = elegido.modo || modoDelCuaderno(t) || r.modo || "recojo";
  const pago = elegido.pago || pagoDelCuaderno(t) || r.pago || null;
  const lineas = armarLineas(r, ctx);

  const segPorId = new Map(ctx.segundos.map((s) => [s.id, s]));
  const faltaProteina = [];
  r.menus.forEach((m) => {
    const s = segPorId.get(m.segundoId);
    if (s?.requiereProteina && !m.proteina && !faltaProteina.some((f) => f.id === s.id)) {
      faltaProteina.push({ id: s.id, nombre: s.nombre, opciones: s.proteinas });
    }
  });
  const faltaEntrada = r.dudas.some((d) => d.startsWith("Pidió entrada pero no dice cuál")) ? ctx.entradas : [];
  const nItems = lineas.fondos.length + lineas.entradas.length + lineas.adicionales.length;

  return {
    lineas,
    modo,
    pago,
    direccion: r.direccion,
    notas: r.notas,
    faltaProteina,
    faltaEntrada,
    dudas: r.dudas.filter((d) => !RESUELTA_CON_BOTON.test(d) && !(nItems === 0 && d.startsWith("No reconocí"))),
    vacio: nItems === 0,
    total: calcularTotalDia(lineas, dia, modo),
  };
}

// Agrega un pedazo al final del texto de la fila: "2 aji" + "sopa" → "2 aji, sopa".
export function agregarAlTexto(texto, pedazo) {
  const base = (texto || "").replace(/[\s,]+$/, "");
  return base ? `${base}, ${pedazo}` : pedazo;
}

// Lo que falta para poder anotar la fila ("" si se puede).
export function faltaParaAnotar(nombre, interp) {
  if (!(nombre || "").trim()) return "Escribe el nombre del cliente.";
  if (interp.vacio) return "Escribe qué pidió (o toca un plato de abajo).";
  if (interp.faltaProteina.length) return `Falta la proteína de ${interp.faltaProteina[0].nombre}.`;
  if (interp.faltaEntrada.length) return "Falta decir qué entrada.";
  if (!interp.pago) return "Elige cómo paga.";
  return "";
}

// Resumen corto de un pedido para la lista: "2 Ají de gallina (pollo) + sopa · 1 Chicha".
export function resumenPedido(order) {
  const partes = [];
  (order.fondos || []).forEach((f) => {
    let p = `${f.cantidad > 1 ? f.cantidad + " " : ""}${f.nombre}`;
    if (f.proteina) p += ` (${f.proteina.toLowerCase()})`;
    if (f.arroz === "sin") p += " sin arroz";
    if (f.entradaIncluida) p += ` + ${f.entradaIncluida.toLowerCase()}`;
    partes.push(p);
  });
  const incluidas = {};
  (order.fondos || []).forEach((f) => f.entradaIncluida && (incluidas[f.entradaIncluida] = (incluidas[f.entradaIncluida] || 0) + f.cantidad));
  (order.entradas || []).forEach((e) => {
    const extra = e.cantidad - (incluidas[e.nombre] || 0);
    if (extra > 0) partes.push(`${extra > 1 ? extra + " " : ""}${e.nombre} aparte`);
  });
  (order.adicionales || []).forEach((a) => partes.push(`${a.cantidad > 1 ? a.cantidad + " " : ""}${a.nombre}`));
  return partes.join(" · ");
}

// ===================== Cuaderno con botones =====================
// El pedido se arma tocando: cada "menú" es una línea con su segundo,
// cantidad (+/−), entrada (o "sin"), proteína y arroz. Los extras y las
// entradas aparte se cuentan con +/−.
//
// estado = {
//   menus: [{ key, segundoId, proteina, entradaId: id | "sin" | null, arroz, cantidad }],
//   extras: { [platoId]: cantidad },
//   entradasExtra: { [platoId]: cantidad },
// }

let siguiente = 0;
export const nuevaClave = () => `m${Date.now().toString(36)}${siguiente++}`;

export const ESTADO_VACIO = { menus: [], extras: {}, entradasExtra: {} };

// Línea nueva para un segundo: si hoy hay una sola entrada, ya va elegida.
export function nuevaLinea(segundo, ctx) {
  return {
    key: nuevaClave(),
    segundoId: segundo.id,
    proteina: segundo.requiereProteina && segundo.proteinas?.length === 1 ? segundo.proteinas[0] : "",
    entradaId: ctx.entradas.length === 1 ? ctx.entradas[0].id : ctx.entradas.length === 0 ? "sin" : null,
    arroz: segundo.permiteArroz ? "con" : null,
    cantidad: 1,
  };
}

// Contexto del Cuaderno: el del menú de hoy (con lo agotado, para poder
// corregir pedidos viejos) más los "adicionales fijos" del catálogo (huevo
// sancochado, presa extra, plancha…): platos de categoría "adicional", activos
// y con precio, que el papá puede anotar cualquier día aunque no estén en el
// menú. La base de datos los acepta igual (validar_pedido).
export function contextoCuaderno(ctx, platos = []) {
  const yaHoy = new Set(ctx.extras.map((e) => e.id));
  const fijos = platos
    .filter((p) => p.activo && p.categoria === "adicional" && p.precioExtra > 0 && !yaHoy.has(p.id))
    .map((p) => ({ id: p.id, nombre: p.nombre.trim(), precio: p.precioExtra, agotado: false, fijo: true }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { ...ctx, extras: [...ctx.extras, ...fijos] };
}

// Lo que falta elegir en un menú antes de agregarlo ("" si está completo).
export function faltaEnLinea(m, ctx) {
  const s = ctx.segundos.find((x) => x.id === m.segundoId);
  if (!s) return "Ese plato ya no está en el menú de hoy.";
  if (s.requiereProteina && !m.proteina) return `Elige la proteína de ${s.nombre}.`;
  if (ctx.entradas.length > 0 && !m.entradaId) return `Elige la entrada de ${s.nombre} (o "Sin entrada").`;
  return "";
}

// "2 × Lomo saltado · pollo · con sopa · sin arroz", para que se vea qué lleva cada línea.
export function textoLinea(m, ctx) {
  const s = ctx.segundos.find((x) => x.id === m.segundoId);
  const e = ctx.entradas.find((x) => x.id === m.entradaId);
  const partes = [`${m.cantidad} × ${s ? s.nombre : "Plato"}`];
  if (m.proteina) partes.push(m.proteina.toLowerCase());
  if (e) partes.push(`con ${e.nombre.toLowerCase()}`);
  else if (m.entradaId === "sin" && ctx.entradas.length) partes.push("sin entrada");
  if (m.arroz === "sin") partes.push("sin arroz");
  return partes.join(" · ");
}

// Precio de una línea de menús (la entrada va incluida).
export const precioLinea = (m, dia, modo = "recojo") => (dia ? m.cantidad * (modo === "delivery" ? dia.precioDelivery : dia.precioRecojo) : 0);

// Estado de botones → pedido (líneas como en la tabla, total y lo que falta).
export function armarDesdeBotones(estado, ctx, dia, modo = "recojo") {
  const segPorId = new Map(ctx.segundos.map((s) => [s.id, s]));
  const menus = estado.menus
    .filter((m) => m.cantidad > 0 && segPorId.has(m.segundoId))
    .map((m) => ({ ...m, entradaId: m.entradaId && m.entradaId !== "sin" ? m.entradaId : null }));
  const aLista = (obj) =>
    Object.entries(obj || {})
      .filter(([, c]) => c > 0)
      .map(([id, cantidad]) => ({ id, cantidad }));
  const lineas = armarLineas({ menus, entradasExtra: aLista(estado.entradasExtra), adicionales: aLista(estado.extras) }, ctx);

  let falta = "";
  for (const m of estado.menus) {
    if (!segPorId.has(m.segundoId) || m.cantidad < 1) continue;
    falta = faltaEnLinea(m, ctx);
    if (falta) break;
  }
  const vacio = lineas.fondos.length + lineas.entradas.length + lineas.adicionales.length === 0;
  return { lineas, total: calcularTotalDia(lineas, dia, modo), falta, vacio };
}

// Pedido guardado → estado de botones (para corregirlo).
export function estadoDesdePedido(order, ctx) {
  const entradasHoy = new Set(ctx.entradas.map((e) => e.id));
  const menus = (order.fondos || []).map((f) => ({
    key: nuevaClave(),
    segundoId: f.platoId,
    proteina: f.proteina || "",
    entradaId: f.entradaId && entradasHoy.has(f.entradaId) ? f.entradaId : "sin",
    arroz: f.arroz || null,
    cantidad: f.cantidad || 1,
  }));
  // Las entradas del pedido incluyen las que van con cada menú; las que sobran son "aparte".
  const incluidas = {};
  menus.forEach((m) => m.entradaId !== "sin" && (incluidas[m.entradaId] = (incluidas[m.entradaId] || 0) + m.cantidad));
  const entradasExtra = {};
  (order.entradas || []).forEach((e) => {
    const extra = (e.cantidad || 0) - (incluidas[e.platoId] || 0);
    if (extra > 0) entradasExtra[e.platoId] = extra;
  });
  const extras = {};
  (order.adicionales || []).forEach((a) => a.platoId && (extras[a.platoId] = (extras[a.platoId] || 0) + (a.cantidad || 0)));
  return { menus, extras, entradasExtra };
}

// ===================== Para la cocina =====================
// Cuántos de cada cosa hay que preparar, sin nombres de clientes.
// Devuelve { segundos: [{ nombre, cantidad, variantes: [{ texto, cantidad }] }],
//            entradas: [{ nombre, cantidad }], extras: [{ nombre, cantidad }],
//            menus, pedidos, delivery, llevar }
export function conteoCocina(orders) {
  const seg = new Map();
  const ent = new Map();
  const ext = new Map();
  let menus = 0;
  let delivery = 0;
  const sumar = (mapa, nombre, n) => mapa.set(nombre, (mapa.get(nombre) || 0) + n);
  for (const o of orders) {
    if (o.modo === "delivery") delivery++;
    for (const f of o.fondos || []) {
      const n = f.cantidad || 0;
      menus += n;
      if (!seg.has(f.nombre)) seg.set(f.nombre, { nombre: f.nombre, cantidad: 0, variantes: new Map() });
      const s = seg.get(f.nombre);
      s.cantidad += n;
      const partes = [f.proteina, f.arroz === "sin" ? "sin arroz" : ""].filter(Boolean);
      if (partes.length) sumar(s.variantes, partes.join(", "), n);
    }
    for (const e of o.entradas || []) sumar(ent, e.nombre, e.cantidad || 0);
    for (const a of o.adicionales || []) sumar(ext, a.nombre, a.cantidad || 0);
  }
  const ordenar = (lista) => lista.sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
  return {
    segundos: ordenar(
      Array.from(seg.values()).map((s) => ({
        nombre: s.nombre,
        cantidad: s.cantidad,
        variantes: Array.from(s.variantes, ([texto, cantidad]) => ({ texto, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
      }))
    ),
    entradas: ordenar(Array.from(ent, ([nombre, cantidad]) => ({ nombre, cantidad }))),
    extras: ordenar(Array.from(ext, ([nombre, cantidad]) => ({ nombre, cantidad }))),
    menus,
    pedidos: orders.length,
    delivery,
    llevar: orders.length - delivery,
  };
}

// Texto para mandar a la cocina por WhatsApp o copiar.
export function textoCocina(c, titulo = "Para la cocina") {
  const l = [`*${titulo}*`, `${c.menus} menús · ${c.pedidos} pedidos (${c.llevar} para llevar, ${c.delivery} delivery)`, ""];
  if (c.segundos.length) {
    l.push("*Segundos*");
    c.segundos.forEach((s) => {
      l.push(`${s.cantidad} × ${s.nombre}`);
      s.variantes.forEach((v) => l.push(`    ${v.cantidad} ${v.texto}`));
    });
    l.push("");
  }
  if (c.entradas.length) {
    l.push("*Entradas*");
    c.entradas.forEach((e) => l.push(`${e.cantidad} × ${e.nombre}`));
    l.push("");
  }
  if (c.extras.length) {
    l.push("*Extras*");
    c.extras.forEach((e) => l.push(`${e.cantidad} × ${e.nombre}`));
  }
  return l.join("\n").trim();
}
