import { supabase } from "./supabaseClient";

export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const todayLabel = () => {
  const d = new Date();
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}`;
};

export const defaultMenu = () => ({
  fondos: ["Arroz con pollo + papa a la huancaína", "Lomo saltado"],
  entradas: ["Ensalada de tomate", "Ensalada de palta", "Ensalada de fideos"],
  bebida: "Chicha morada",
  fecha: todayKey(),
});

// ---------- MENÚ ----------
// Hay una sola fila en la tabla "menu" con id = 1, que siempre se actualiza (upsert).
export async function loadMenu() {
  const { data, error } = await supabase.from("menu").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return defaultMenu();
  return {
    fondos: data.fondos ?? defaultMenu().fondos,
    entradas: data.entradas ?? defaultMenu().entradas,
    bebida: data.bebida ?? defaultMenu().bebida,
    fecha: data.fecha ?? todayKey(),
  };
}

export async function saveMenu(menu) {
  const { error } = await supabase.from("menu").upsert({
    id: 1,
    fondos: menu.fondos,
    entradas: menu.entradas,
    bebida: menu.bebida,
    fecha: menu.fecha ?? todayKey(),
  });
  if (error) throw error;
  return true;
}

// ---------- PEDIDOS ----------
export async function loadOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("creado_en", { ascending: true });
  if (error || !data) return [];
  return data.map(rowToOrder);
}

export async function createOrder(order) {
  const row = orderToRow(order);
  const { data, error } = await supabase.from("orders").insert(row).select().single();
  if (error) throw error;
  return rowToOrder(data);
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

// Convierte una fila de la tabla "orders" (snake_case) al formato que usa la app (camelCase)
function rowToOrder(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    fondos: row.fondos ?? [],
    entradas: row.entradas ?? [],
    bebida: row.bebida ?? null,
    modo: row.modo,
    direccion: row.direccion ?? "",
    pago: row.pago,
    notas: row.notas ?? "",
    fecha: row.fecha,
    creadoEn: row.creado_en,
    listo: row.listo,
    pagado: row.pagado,
  };
}

// Convierte el formato de la app al formato de la tabla (para insertar)
function orderToRow(order) {
  return {
    nombre: order.nombre,
    telefono: order.telefono,
    fondos: order.fondos,
    entradas: order.entradas,
    bebida: order.bebida,
    modo: order.modo,
    direccion: order.direccion,
    pago: order.pago,
    notas: order.notas,
    fecha: order.fecha,
    creado_en: order.creadoEn,
    listo: order.listo,
    pagado: order.pagado,
  };
}

// ---------- BIBLIOTECA DE PLATOS FRECUENTES ----------
export async function loadPlatosFrecuentes() {
  const { data, error } = await supabase
    .from("platos_frecuentes")
    .select("*")
    .order("nombre", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    proteinas: row.proteinas ?? "",
    permiteArroz: row.permite_arroz ?? false,
  }));
}

// Guarda un plato en la biblioteca, o lo actualiza si ya existía uno con el
// mismo nombre (sin importar mayúsculas ni espacios extra) pero con
// proteínas distintas a las de ahora. platosExistentes es la lista ya
// cargada en memoria, para no tener que consultar la base de datos de nuevo
// por cada plato.
export async function guardarPlatoFrecuente(plato, platosExistentes) {
  const nombreLimpio = plato.nombre.trim();
  const existente = platosExistentes.find(
    (p) => p.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase()
  );

  if (existente) {
    const proteinasNuevas = plato.proteinas || "";
    const permiteArrozNuevo = !!plato.permiteArroz;
    const sinCambios = existente.proteinas === proteinasNuevas && existente.permiteArroz === permiteArrozNuevo;
    if (sinCambios) return existente;

    const { error } = await supabase
      .from("platos_frecuentes")
      .update({ proteinas: proteinasNuevas, permite_arroz: permiteArrozNuevo })
      .eq("id", existente.id);
    if (error) throw error;
    return { ...existente, proteinas: proteinasNuevas, permiteArroz: permiteArrozNuevo };
  }

  const { data, error } = await supabase
    .from("platos_frecuentes")
    .insert({ nombre: nombreLimpio, proteinas: plato.proteinas || "", permite_arroz: !!plato.permiteArroz })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, nombre: data.nombre, proteinas: data.proteinas ?? "", permiteArroz: data.permite_arroz ?? false };
}
