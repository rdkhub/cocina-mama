// src/lib/compartir.js
// Texto del menú de hoy para compartir por WhatsApp con un link wa.me
// (gratis, sin la API de WhatsApp: abre WhatsApp con el mensaje escrito y
// el papá elige a quién o a qué grupo mandarlo).
import { fechaLabel } from "../data";
import { APP_URL } from "../utils/contacto";
import { soles } from "../utils/pedidos";

export const SALUDO_POR_DEFECTO = "¡Hola! 👋 Este es el *menú de hoy* en *Cocina de Mamá*:";
export const CIERRE_POR_DEFECTO = "¡Te esperamos! 😊";

const disponibles = (lista) => lista.filter((x) => !x.item.agotado);

function lineaSegundo({ item, plato }) {
  const opciones = plato.requiereProteina ? item.proteinas : [];
  return opciones.length > 0 ? `• ${plato.nombre.trim()} (${opciones.join(" o ")})` : `• ${plato.nombre.trim()}`;
}

export function textoMenuWhatsApp(menuHoy, ajustes = {}) {
  const dia = menuHoy.dia;
  const entradas = disponibles(menuHoy.entradas);
  const segundos = disponibles(menuHoy.segundos);
  const extras = disponibles(menuHoy.extras);
  const l = [];

  l.push((ajustes.plantillaSaludo || SALUDO_POR_DEFECTO).trim());
  l.push(`📅 ${fechaLabel(menuHoy.fecha)}`);
  l.push("");

  if (entradas.length) {
    l.push("🥗 *Entradas*");
    entradas.forEach(({ plato }) => l.push(`• ${plato.nombre.trim()}`));
    l.push("");
  }
  if (segundos.length) {
    l.push("🍛 *Segundos*");
    segundos.forEach((x) => l.push(lineaSegundo(x)));
    l.push("");
  }
  if (dia?.refresco?.trim()) {
    l.push(`🥤 Refresco del día: ${dia.refresco.trim()}`);
    l.push("");
  }
  if (dia) {
    l.push(`💰 *Menú completo: ${soles(dia.precioRecojo)}*`);
    l.push(`🛵 Delivery: ${soles(dia.precioDelivery)}`);
    l.push("");
  }
  if (extras.length) {
    l.push("➕ *Extras*");
    extras.forEach(({ plato }) => l.push(`• ${plato.nombre.trim()}: ${soles(plato.precioExtra)}`));
    l.push("");
  }

  l.push("📲 Pide aquí:");
  l.push(APP_URL);
  const cierre = (ajustes.plantillaCierre ?? CIERRE_POR_DEFECTO).trim();
  if (cierre) {
    l.push("");
    l.push(cierre);
  }
  return l.join("\n");
}

export function linkWhatsApp(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
