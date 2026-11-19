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
