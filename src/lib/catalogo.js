// src/lib/catalogo.js
// Acceso a Supabase para el catálogo de platos, el menú de cada día y los
// ajustes. Todo lo de pedidos sigue en src/data.js para no tocar lo que ya
// funciona (deudas, historial, resumen semanal).
import { supabase } from "../supabaseClient";

export const CATEGORIAS = [
  { id: "entrada", label: "Entradas", singular: "Entrada", emoji: "🥗" },
  { id: "segundo", label: "Segundos", singular: "Segundo", emoji: "🍛" },
  { id: "postre", label: "Postres", singular: "Postre", emoji: "🍮" },
  { id: "bebida", label: "Bebidas", singular: "Bebida", emoji: "🥤" },
  { id: "adicional", label: "Adicionales", singular: "Adicional", emoji: "➕" },
];

// Categorías que el cliente pide aparte, con su propio precio.
export const CATEGORIAS_EXTRA = ["postre", "bebida", "adicional"];

export const categoriaInfo = (id) => CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[1];

export const PRECIOS_POR_DEFECTO = { precioRecojo: 11, precioDelivery: 13, precioEntradaExtra: 3 };

// fotos_proteina llega como { "Chuleta": { url, path } }. Se limpia por si
// alguna entrada vino incompleta.
function normalizarFotosProteina(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  Object.entries(v).forEach(([prot, f]) => {
    if (f && typeof f.url === "string" && f.url) out[prot] = { url: f.url, path: f.path || "" };
  });
  return out;
}

// Foto que corresponde mostrar: la de la proteína elegida si existe, si no la base.
export function fotoDePlato(plato, proteina) {
  if (proteina && plato?.fotosProteina?.[proteina]?.url) return plato.fotosProteina[proteina].url;
  return plato?.fotoUrl || "";
}

// ¿Algún plato (aparte de `exceptoId`) usa este archivo? Varias fichas del
// catálogo comparten la misma foto, así que no se borra si sigue en uso.
export function fotoEnUso(platos, path, exceptoId) {
  if (!path) return false;
  return platos.some(
    (p) =>
      p.id !== exceptoId &&
      (p.fotoPath === path || Object.values(p.fotosProteina || {}).some((f) => f.path === path))
  );
}

function rowToPlato(r) {
  return {
    id: r.id,
    nombre: r.nombre,
    categoria: r.categoria,
    descripcion: r.descripcion || "",
    fotoUrl: r.foto_url || "",
    fotoPath: r.foto_path || "",
    fotosProteina: normalizarFotosProteina(r.fotos_proteina),
    requiereProteina: !!r.requiere_proteina,
    permiteArroz: !!r.permite_arroz,
    precioExtra: Number(r.precio_extra || 0),
    activo: r.activo !== false,
  };
}

function rowToMenuDia(r) {
  return {
    fecha: r.fecha,
    precioRecojo: Number(r.precio_recojo),
    precioDelivery: Number(r.precio_delivery),
    precioEntradaExtra: Number(r.precio_entrada_extra),
    refresco: r.refresco || "",
    nota: r.nota || "",
  };
}

function rowToItem(r) {
  return {
    id: r.id,
    fecha: r.fecha,
    platoId: r.plato_id,
    proteinas: r.proteinas || [],
    agotado: !!r.agotado,
    orden: r.orden || 0,
  };
}

// ---------- Catálogo ----------
export async function cargarPlatos() {
  const { data, error } = await supabase.from("platos").select("*").order("nombre");
  if (error) throw error;
  return data.map(rowToPlato);
}

export async function guardarPlato(plato) {
  const row = {
    nombre: plato.nombre.trim(),
    categoria: plato.categoria,
    descripcion: (plato.descripcion || "").trim(),
    foto_url: plato.fotoUrl || null,
    foto_path: plato.fotoPath || null,
    fotos_proteina: plato.fotosProteina || {},
    requiere_proteina: plato.categoria === "segundo" && !!plato.requiereProteina,
    permite_arroz: plato.categoria === "segundo" && !!plato.permiteArroz,
    precio_extra: Number(plato.precioExtra || 0),
    activo: plato.activo !== false,
  };
  const query = plato.id
    ? supabase.from("platos").update(row).eq("id", plato.id)
    : supabase.from("platos").insert(row);
  const { data, error } = await query.select().single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un plato con ese nombre en esa categoría.");
    throw error;
  }
  return rowToPlato(data);
}

export async function cambiarActivoPlato(id, activo) {
  const { error } = await supabase.from("platos").update({ activo }).eq("id", id);
  if (error) throw error;
}

// Sube una foto ya comprimida (Blob) al bucket "platos" y devuelve su URL pública.
export async function subirFotoPlato(blob, nombreBase) {
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const slug = (nombreBase || "plato")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const path = `${slug || "plato"}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("platos").upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("platos").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function borrarFotoPlato(path) {
  if (!path) return;
  await supabase.storage.from("platos").remove([path]);
}

// ---------- Proteínas (se reutiliza la tabla existente) ----------
export async function cargarProteinas() {
  const { data, error } = await supabase.from("proteinas").select("*").order("nombre");
  if (error) throw error;
  return data.map((r) => ({ id: r.id, nombre: r.nombre }));
}

export async function crearProteina(nombre) {
  const { data, error } = await supabase.from("proteinas").insert({ nombre: nombre.trim() }).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("Esa proteína ya existe.");
    throw error;
  }
  return { id: data.id, nombre: data.nombre };
}

// ---------- Menú del día ----------
export async function cargarMenuDia(fecha) {
  const [{ data: dia, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    supabase.from("menu_dia").select("*").eq("fecha", fecha).maybeSingle(),
    supabase.from("menu_dia_items").select("*").eq("fecha", fecha).order("orden"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { dia: dia ? rowToMenuDia(dia) : null, items: (items || []).map(rowToItem) };
}

// Crea la fila del día si no existe, heredando precios y refresco del último
// menú guardado (así los precios no se vuelven a escribir cada día).
export async function asegurarMenuDia(fecha) {
  const { data: existente } = await supabase.from("menu_dia").select("*").eq("fecha", fecha).maybeSingle();
  if (existente) return rowToMenuDia(existente);
  const { data: anterior } = await supabase
    .from("menu_dia")
    .select("*")
    .lt("fecha", fecha)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = {
    fecha,
    precio_recojo: anterior?.precio_recojo ?? PRECIOS_POR_DEFECTO.precioRecojo,
    precio_delivery: anterior?.precio_delivery ?? PRECIOS_POR_DEFECTO.precioDelivery,
    precio_entrada_extra: anterior?.precio_entrada_extra ?? PRECIOS_POR_DEFECTO.precioEntradaExtra,
    refresco: anterior?.refresco ?? "",
  };
  const { data, error } = await supabase.from("menu_dia").upsert(row, { onConflict: "fecha" }).select().single();
  if (error) throw error;
  return rowToMenuDia(data);
}

export async function actualizarMenuDia(fecha, cambios) {
  const row = {};
  if ("precioRecojo" in cambios) row.precio_recojo = Number(cambios.precioRecojo) || 0;
  if ("precioDelivery" in cambios) row.precio_delivery = Number(cambios.precioDelivery) || 0;
  if ("precioEntradaExtra" in cambios) row.precio_entrada_extra = Number(cambios.precioEntradaExtra) || 0;
  if ("refresco" in cambios) row.refresco = cambios.refresco;
  if ("nota" in cambios) row.nota = cambios.nota;
  const { error } = await supabase.from("menu_dia").update(row).eq("fecha", fecha);
  if (error) throw error;
}

export async function agregarItem(fecha, platoId, orden = 0) {
  const { data, error } = await supabase
    .from("menu_dia_items")
    .upsert({ fecha, plato_id: platoId, orden }, { onConflict: "fecha,plato_id" })
    .select()
    .single();
  if (error) throw error;
  return rowToItem(data);
}

export async function quitarItem(id) {
  const { error } = await supabase.from("menu_dia_items").delete().eq("id", id);
  if (error) throw error;
}

export async function actualizarItem(id, cambios) {
  const row = {};
  if ("proteinas" in cambios) row.proteinas = cambios.proteinas;
  if ("agotado" in cambios) row.agotado = cambios.agotado;
  const { error } = await supabase.from("menu_dia_items").update(row).eq("id", id);
  if (error) throw error;
}

// Fechas anteriores que tienen menú, para "Copiar menú de otro día".
export async function listarDiasConMenu(antesDe, limite = 30) {
  const { data, error } = await supabase
    .from("menu_dia_items")
    .select("fecha")
    .lt("fecha", antesDe)
    .order("fecha", { ascending: false })
    .limit(400);
  if (error) throw error;
  const conteo = new Map();
  data.forEach((r) => conteo.set(r.fecha, (conteo.get(r.fecha) || 0) + 1));
  return Array.from(conteo.entries())
    .slice(0, limite)
    .map(([fecha, cantidad]) => ({ fecha, cantidad }));
}

// Copia los platos (con sus proteínas) y los precios de otro día al día
// destino. Reemplaza lo que hubiera en el destino. "Agotado" nunca se copia.
export async function copiarMenu(desde, hacia) {
  const origen = await cargarMenuDia(desde);
  await asegurarMenuDia(hacia);
  if (origen.dia) {
    await actualizarMenuDia(hacia, {
      precioRecojo: origen.dia.precioRecojo,
      precioDelivery: origen.dia.precioDelivery,
      precioEntradaExtra: origen.dia.precioEntradaExtra,
      refresco: origen.dia.refresco,
    });
  }
  const { error: eDel } = await supabase.from("menu_dia_items").delete().eq("fecha", hacia);
  if (eDel) throw eDel;
  if (origen.items.length > 0) {
    const filas = origen.items.map((it, i) => ({
      fecha: hacia,
      plato_id: it.platoId,
      proteinas: it.proteinas,
      orden: i,
    }));
    const { error } = await supabase.from("menu_dia_items").insert(filas);
    if (error) throw error;
  }
  return origen.items.length;
}

// Mantiene la tabla vieja "menu" (fila id=1) sincronizada con el menú nuevo.
// Así, si algún día hay que volver a la versión anterior de la app, el menú
// del día sigue ahí y nada se rompe.
export async function sincronizarMenuViejo(fecha, dia, items, platosPorId) {
  const conPlato = items.map((it) => ({ it, p: platosPorId.get(it.platoId) })).filter((x) => x.p);
  const fondos = conPlato
    .filter((x) => x.p.categoria === "segundo")
    .map(({ it, p }) => ({
      nombre: p.nombre,
      platoId: p.id,
      proteinas: p.requiereProteina ? it.proteinas.join(", ") : "",
      permiteArroz: p.permiteArroz,
    }));
  const entradas = conPlato.filter((x) => x.p.categoria === "entrada").map((x) => x.p.nombre);
  const adicionales = conPlato
    .filter((x) => CATEGORIAS_EXTRA.includes(x.p.categoria))
    .map((x) => ({ nombre: x.p.nombre, precio: x.p.precioExtra }));
  await supabase.from("menu").upsert({
    id: 1,
    fondos,
    entradas,
    adicionales,
    bebida: dia?.refresco || "",
    fecha,
  });
}

// ---------- Ajustes ----------
export async function cargarAjustes() {
  const { data, error } = await supabase.from("ajustes").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return {
    plantillaSaludo: data?.plantilla_saludo || "",
    plantillaCierre: data?.plantilla_cierre || "",
  };
}

export async function guardarAjustes({ plantillaSaludo, plantillaCierre }) {
  const { error } = await supabase
    .from("ajustes")
    .update({ plantilla_saludo: plantillaSaludo, plantilla_cierre: plantillaCierre })
    .eq("id", 1);
  if (error) throw error;
}
