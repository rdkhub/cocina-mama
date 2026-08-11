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

// ---------- BIBLIOTECA DE PLATOS ----------
// Cada plato guarda solo su NOMBRE y si necesita elegir proteína o no —
// nunca guarda QUÉ proteínas lleva, porque eso cambia día a día.
export async function loadPlatosFrecuentes() {
  const { data, error } = await supabase
    .from("platos_frecuentes")
    .select("*")
    .order("nombre", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    requiereProteina: row.requiere_proteina ?? false,
    permiteArroz: row.permite_arroz ?? false,
  }));
}

export async function crearPlatoFrecuente({ nombre, requiereProteina, permiteArroz }) {
  const { data, error } = await supabase
    .from("platos_frecuentes")
    .insert({ nombre: nombre.trim(), requiere_proteina: !!requiereProteina, permite_arroz: !!permiteArroz })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    nombre: data.nombre,
    requiereProteina: data.requiere_proteina,
    permiteArroz: data.permite_arroz,
  };
}

// ---------- BIBLIOTECA DE PROTEÍNAS ----------
// Lista compartida entre todos los platos que necesiten proteína. Se elige
// libre cada día — nunca se recuerda qué se usó la última vez para un plato.
export async function loadProteinas() {
  const { data, error } = await supabase
    .from("proteinas")
    .select("*")
    .order("nombre", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, nombre: row.nombre }));
}

export async function crearProteina(nombre) {
  const { data, error } = await supabase
    .from("proteinas")
    .insert({ nombre: nombre.trim() })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, nombre: data.nombre };
}
