// src/utils/contacto.js

// Número de WhatsApp del negocio, en formato internacional sin espacios ni signos.
// Si el número cambia algún día, solo hay que editarlo aquí — todos los botones
// de WhatsApp de la app (el flotante y el del encabezado) lo usan desde este archivo.
export const WHATSAPP_NUMBER = "51998869843";

// Enlace que abre WhatsApp directo con este número, sin mensaje pre-escrito
// (el cliente escribe lo que quiera).
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Número para mostrar: "998 869 843".
export const WHATSAPP_VISIBLE = WHATSAPP_NUMBER.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");

// Dónde queda el local.
export const DIRECCION = {
  linea1: "Calle Pongo de Rentema, Mz.\u00a0A, Lt.\u00a018",
  linea2: "Las Lomas de La Molina Vieja, La\u00a0Molina",
};
// Para Google Maps se busca la calle (la manzana y el lote no los conoce).
const BUSQUEDA_MAPA = "Calle Pongo de Rentema, La Molina, Lima, Perú";
export const MAPA_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSQUEDA_MAPA)}`;
export const MAPA_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(BUSQUEDA_MAPA)}&z=16&output=embed`;

// URL pública de la app, para incluirla en el aviso del menú del día.
export const APP_URL = "https://cocina-mama-roan.vercel.app/";
