// src/lib/leerPedido.js
// Convierte un mensaje de WhatsApp en un pedido del menú de hoy. Primero lo
// intenta con IA (función leer-pedido en Supabase, si hay clave configurada);
// si no hay IA o falla, usa el lector local. El resultado siempre se revisa
// a mano antes de guardar.
import { supabase } from "../supabaseClient";
import { leerPedidoLocal } from "./leerPedidoLocal";

// Arma la lista de platos de hoy (sin los agotados) que usan los dos lectores.
export function contextoDelMenu(menuHoy, platos = []) {
  const disponibles = (lista) => lista.filter((x) => !x.item.agotado);
  return {
    segundos: disponibles(menuHoy.segundos).map(({ item, plato }) => ({
      id: plato.id,
      nombre: plato.nombre.trim(),
      proteinas: plato.requiereProteina ? item.proteinas : [],
      requiereProteina: plato.requiereProteina && item.proteinas.length > 0,
      permiteArroz: plato.permiteArroz,
    })),
    entradas: disponibles(menuHoy.entradas).map(({ plato }) => ({ id: plato.id, nombre: plato.nombre.trim() })),
    extras: disponibles(menuHoy.extras).map(({ plato }) => ({ id: plato.id, nombre: plato.nombre.trim(), precio: plato.precioExtra })),
    // Todo el catálogo, para avisar si piden algo que hoy no hay.
    catalogo: platos.filter((p) => p.activo).map((p) => ({ id: p.id, nombre: p.nombre.trim() })),
  };
}

// Deja solo ids que existen hoy y valores válidos (la IA podría equivocarse).
function limpiar(res, ctx) {
  const seg = new Map(ctx.segundos.map((s) => [s.id, s]));
  const ent = new Set(ctx.entradas.map((e) => e.id));
  const ext = new Set(ctx.extras.map((e) => e.id));
  const dudas = [...(res.dudas || [])];
  const cant = (n) => Math.min(30, Math.max(1, Math.round(Number(n) || 1)));
  const menus = (res.menus || [])
    .filter((m) => {
      if (seg.has(m.segundoId)) return true;
      dudas.push("Había un plato que no está en el menú de hoy.");
      return false;
    })
    .map((m) => {
      const s = seg.get(m.segundoId);
      return {
        segundoId: m.segundoId,
        proteina: s.proteinas.includes(m.proteina) ? m.proteina : "",
        entradaId: ent.has(m.entradaId) ? m.entradaId : null,
        arroz: s.permiteArroz ? (m.arroz === "sin" ? "sin" : "con") : null,
        cantidad: cant(m.cantidad),
      };
    });
  return {
    nombre: (res.nombre || "").slice(0, 60),
    telefono: (res.telefono || "").replace(/\D/g, "").slice(-9),
    menus,
    entradasExtra: (res.entradasExtra || []).filter((e) => ent.has(e.id)).map((e) => ({ id: e.id, cantidad: cant(e.cantidad) })),
    adicionales: (res.adicionales || []).filter((e) => ext.has(e.id)).map((e) => ({ id: e.id, cantidad: cant(e.cantidad) })),
    modo: res.modo === "delivery" || res.modo === "recojo" ? res.modo : null,
    direccion: (res.direccion || "").slice(0, 160),
    pago: ["yape", "efectivo", "fiado"].includes(res.pago) ? res.pago : null,
    notas: (res.notas || "").slice(0, 200),
    dudas: Array.from(new Set(dudas)),
  };
}

export async function leerPedido(texto, ctx) {
  const local = limpiar(leerPedidoLocal(texto, ctx), ctx);
  try {
    const { data, error } = await supabase.functions.invoke("leer-pedido", {
      body: {
        texto,
        menu: { segundos: ctx.segundos, entradas: ctx.entradas, extras: ctx.extras },
      },
    });
    if (error || !data?.pedido) return { ...local, fuente: "local", motivoSinIA: data?.error || "IA_NO_DISPONIBLE" };
    const ia = limpiar(data.pedido, ctx);
    // El nombre y teléfono del encabezado de WhatsApp los saca mejor el lector local.
    return { ...ia, nombre: ia.nombre || local.nombre, telefono: ia.telefono || local.telefono, fuente: "ia" };
  } catch {
    return { ...local, fuente: "local", motivoSinIA: "IA_NO_DISPONIBLE" };
  }
}
