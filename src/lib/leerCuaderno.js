// src/lib/leerCuaderno.js
// Foto de la hoja del cuaderno → lista de pedidos (función leer-cuaderno en
// Supabase, con IA). Todo se revisa en la app antes de guardar.
import { supabase } from "../supabaseClient";
import { limpiar } from "./leerPedido";

const LADO_MAXIMO = 1800; // suficiente para leer letra a mano, sin mandar fotos pesadas

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo abrir la foto. Prueba con otra."));
    };
    img.src = url;
  });
}

export async function fotoABase64(file) {
  const img = await cargarImagen(file);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * escala);
  canvas.height = Math.round(img.naturalHeight * escala);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

const MENSAJES = {
  SIN_IA: "Falta activar la IA: hay que poner la clave de Anthropic en Supabase.",
  CLAVE_INVALIDA: "La clave de la IA no es válida. Revisa la clave en Supabase.",
  SIN_SALDO_O_FOTO_INVALIDA: "La IA no pudo leer la foto (o se acabó el saldo). Intenta con otra foto.",
  IA_NO_DISPONIBLE: "La IA no respondió. Intenta de nuevo en un rato.",
};

export async function leerCuaderno(file, ctx) {
  const dataUrl = await fotoABase64(file);
  const { data, error } = await supabase.functions.invoke("leer-cuaderno", {
    body: { imagen: dataUrl, tipo: "image/jpeg", menu: { segundos: ctx.segundos, entradas: ctx.entradas, extras: ctx.extras } },
  });
  if (error) throw new Error("No se pudo conectar. Revisa tu internet.");
  if (data?.error) throw new Error(MENSAJES[data.error] || data.error);
  const pedidos = (data?.pedidos || []).map((p) => ({
    ...limpiar(p, ctx),
    nombre: (p.nombre || "").trim().slice(0, 60),
    tachado: !!p.tachado,
    listo: !!p.listo,
  }));
  return { pedidos, dudasGenerales: data?.dudasGenerales || [] };
}

// Pedido de la pantalla → formato de la tabla orders (igual que ClientView).
export function armarPedido({ menus, entradasExtra = [], adicionales = [] }, ctx) {
  const seg = new Map(ctx.segundos.map((s) => [s.id, s]));
  const ent = new Map(ctx.entradas.map((s) => [s.id, s]));
  const ext = new Map(ctx.extras.map((s) => [s.id, s]));
  const porCombo = new Map();
  menus.forEach((m) => {
    const clave = `${m.segundoId}|${m.proteina || ""}|${m.arroz || ""}|${m.entradaId || ""}`;
    const prev = porCombo.get(clave);
    if (prev) prev.cantidad += m.cantidad;
    else porCombo.set(clave, { ...m });
  });
  const fondos = Array.from(porCombo.values()).map((m) => ({
    platoId: m.segundoId,
    nombre: seg.get(m.segundoId).nombre,
    cantidad: m.cantidad,
    ...(m.proteina ? { proteina: m.proteina } : {}),
    ...(m.arroz ? { arroz: m.arroz } : {}),
    ...(m.entradaId ? { entradaId: m.entradaId, entradaIncluida: ent.get(m.entradaId).nombre } : {}),
  }));
  const conteoEnt = new Map();
  menus.forEach((m) => m.entradaId && conteoEnt.set(m.entradaId, (conteoEnt.get(m.entradaId) || 0) + m.cantidad));
  entradasExtra.forEach((e) => conteoEnt.set(e.id, (conteoEnt.get(e.id) || 0) + e.cantidad));
  const conteoExt = new Map();
  adicionales.forEach((a) => conteoExt.set(a.id, (conteoExt.get(a.id) || 0) + a.cantidad));
  return {
    fondos,
    entradas: Array.from(conteoEnt, ([id, cantidad]) => ({ platoId: id, nombre: ent.get(id).nombre, cantidad })),
    adicionales: Array.from(conteoExt, ([id, cantidad]) => ({ platoId: id, nombre: ext.get(id).nombre, cantidad, precio: ext.get(id).precio })),
  };
}
