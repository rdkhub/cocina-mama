// src/utils/aviso.js
import { todayLabel } from "../data";

// Genera el texto del aviso del menú del día, listo para copiar y pegar en
// WhatsApp o Facebook. Usa EXACTAMENTE los platos, entradas y bebida que ya
// están en el menú — nunca inventa nombres, precios ni promociones. Los
// platos con opciones de proteína (ej: "Pollo a la plancha, Bistec") se
// muestran como alternativas ("Lentejas — Pollo a la plancha o Bistec"),
// igual que se ven en la app.
export function generarTextoAviso(menu, appUrl) {
  const lineas = [];
  lineas.push("🍽️ *MENÚ DE HOY — COCINA DE MAMÁ*");
  lineas.push(`📅 ${todayLabel()}`);
  lineas.push("");

  const entradas = (menu.entradas || []).filter((e) => e && e.trim() !== "");
  if (entradas.length > 0) {
    lineas.push("🥗 *Entradas*");
    entradas.forEach((e) => lineas.push(`• ${e}`));
    lineas.push("");
  }

  const fondos = (menu.fondos || []).filter((f) => f.nombre && f.nombre.trim() !== "");
  if (fondos.length > 0) {
    lineas.push("🍛 *Segundos*");
    fondos.forEach((f) => {
      const opciones = (f.proteinas || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      if (opciones.length > 0) {
        lineas.push(`• ${f.nombre} — ${opciones.join(" o ")}`);
      } else {
        lineas.push(`• ${f.nombre}`);
      }
    });
    lineas.push("");
  }

  const adicionales = (menu.adicionales || []).filter((a) => a.nombre && a.nombre.trim() !== "");
  if (adicionales.length > 0) {
    lineas.push("➕ *Adicionales*");
    adicionales.forEach((a) => lineas.push(`• ${a.nombre} — S/ ${Number(a.precio || 0).toFixed(2)}`));
    lineas.push("");
  }

  if (menu.bebida && menu.bebida.trim() !== "") {
    lineas.push(`🥤 + Refresco: ${menu.bebida}`);
    lineas.push("");
  }

  lineas.push("📲 Haz tu pedido aquí:");
  lineas.push(appUrl);
  lineas.push("");
  lineas.push("¡Los esperamos! ❤️");

  return lineas.join("\n");
}
