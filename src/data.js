// src/data.js
// Pedidos (tabla "orders") y utilidades de fecha. El catálogo de platos y el
// menú de cada día viven en src/lib/catalogo.js.
import { supabase } from "./supabaseClient";
import { calcularTotal } from "./utils/pedidos";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Fecha local en formato YYYY-MM-DD (así se guardan los pedidos y los menús).
export const fechaKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayKey = () => fechaKey(new Date());

// "2026-10-16" → Date local (sin desfase de zona horaria).
export const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "Viernes 16 de octubre"
export const fechaLabel = (key) => {
  const d = keyToDate(key);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

export const todayLabel = () => fechaLabel(todayKey());

// ---------- PEDIDOS ----------
export async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("creado_en", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

// El cliente solo puede crear pedidos, no leerlos (los datos de los demás
// clientes son privados). Por eso el id se genera aquí y no se pide la fila
// de vuelta; el total que ve el cliente es el que calculó la pantalla, y la
// base de datos guarda el suyo (validar_pedido).
const nuevoUuid = () =>
  crypto.randomUUID?.() ??
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );

export async function createOrder(order) {
  const row = { id: nuevoUuid(), ...orderToRow(order) };
  const { error } = await supabase.from("orders").insert(row);
  if (error) throw error;
  return { ...order, id: row.id, total: Number(order.totalEstimado) || 0, formato: 2 };
}

export async function updateOrder(id, patch) {
  const dbPatch = {};
  if ("listo" in patch) dbPatch.listo = patch.listo;
  if ("pagado" in patch) dbPatch.pagado = patch.pagado;
  const { error } = await supabase.from("orders").update(dbPatch).eq("id", id);
  if (error) throw error;
  return true;
}

export async function deleteOrder(id) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
  return true;
}

// Fila de la tabla (snake_case) → objeto de la app (camelCase).
//
// El total:
//  - Pedidos nuevos (formato 2): el total lo calcula la base de datos con
//    los precios del menú de ese día, y se usa tal cual.
//  - Pedidos de antes (formato 1): se calcula igual que siempre (S/12 o
//    S/13 por plato, S/3 por entrada extra), para que las deudas, el
//    historial y los resúmenes semanales no cambien.
function rowToOrder(row) {
  const order = {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    fondos: row.fondos ?? [],
    entradas: row.entradas ?? [],
    adicionales: row.adicionales ?? [],
    bebida: row.bebida ?? null,
    modo: row.modo,
    direccion: row.direccion ?? "",
    pago: row.pago,
    notas: row.notas ?? "",
    fecha: row.fecha,
    creadoEn: row.creado_en,
    listo: row.listo,
    pagado: row.pagado,
    formato: Number(row.formato) || 1,
    origen: row.origen || "app",
    mensajeOriginal: row.mensaje_original || "",
  };
  order.total =
    order.formato >= 2
      ? Number(row.total) || 0
      : calcularTotal(order.fondos, order.entradas, order.modo, order.adicionales);
  return order;
}

// Objeto de la app → fila para insertar. El total lo pone la base de datos.
function orderToRow(order) {
  return {
    nombre: order.nombre,
    telefono: order.telefono,
    fondos: order.fondos,
    entradas: order.entradas,
    adicionales: order.adicionales ?? [],
    bebida: order.bebida ?? null,
    modo: order.modo,
    direccion: order.direccion,
    pago: order.pago,
    notas: order.notas,
    fecha: order.fecha,
    creado_en: order.creadoEn,
    listo: order.listo,
    pagado: order.pagado,
    formato: 2,
    origen: order.origen || "app",
    mensaje_original: order.mensajeOriginal || "",
  };
}
