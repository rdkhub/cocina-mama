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
  referencia: "A una casa del Taller de motos Garro, junto al parque",
};
// Punto exacto: el Taller de motos Garro (la casa está a su lado). Google Maps
// no conoce la manzana ni el lote, por eso se usan coordenadas.
const PUNTO = "-12.1061397,-76.9349552";
export const MAPA_URL = `https://www.google.com/maps/dir/?api=1&destination=${PUNTO}`;
export const MAPA_EMBED_URL = `https://www.google.com/maps?q=${PUNTO}&z=18&output=embed`;

// URL pública de la app, para incluirla en el aviso del menú del día.
export const APP_URL = "https://cocina-mama-roan.vercel.app/";
