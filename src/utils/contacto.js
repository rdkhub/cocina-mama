// src/utils/contacto.js

// Número de WhatsApp del negocio, en formato internacional sin espacios ni signos.
// Si el número cambia algún día, solo hay que editarlo aquí — todos los botones
// de WhatsApp de la app (el flotante y el del encabezado) lo usan desde este archivo.
export const WHATSAPP_NUMBER = "51998869843";

// Enlace que abre WhatsApp directo con este número, sin mensaje pre-escrito
// (el cliente escribe lo que quiera).
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
