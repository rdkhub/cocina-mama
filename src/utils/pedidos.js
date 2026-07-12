// src/utils/pedidos.js

// ---------- Precios ----------
// El precio del fondo (solo, o acompañado de entrada formando un menú completo)
// sube S/1 cuando es delivery. La entrada adicional/sola siempre cuesta lo mismo.
export const PRECIO_FONDO_RECOJO = 12; // 1 fondo (con o sin entrada) — recojo en local
export const PRECIO_FONDO_DELIVERY = 13; // 1 fondo (con o sin entrada) — delivery
export const PRECIO_ENTRADA_SOLA = 3; // entrada sin fondo que la acompañe (no varía por modo)

export const PAY_LABELS = {
  yape: "Yape",
  efectivo: "Efectivo",
  fiado: "Fiado / Debe",
};

export const PAY_COLORS = {
  yape: "#5C7A4F",
  efectivo: "#9C7A3C",
  fiado: "#C1452D",
};

// Suma cantidades de un arreglo [{ nombre, cantidad }, ...]
export function sumarCantidades(items) {
  return (items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
}

// Calcula el total a pagar: cada fondo (solo, o emparejado con una entrada)
// cuesta S/12 en recojo o S/13 en delivery. Las entradas que NO vinieron asociadas
// a un fondo (es decir, las que el cliente pidió de más, sueltas) cuestan S/3 cada
// una, sin importar el modo de entrega. Los adicionales se cobran aparte, cada uno
// según su propio precio.
export function calcularTotal(fondos, entradas, modo = "recojo", adicionales = []) {
  const totalFondos = sumarCantidades(fondos);
  const totalEntradas = sumarCantidades(entradas);
  // Cuenta cuántas unidades de fondo realmente usaron una entrada incluida
  // (campo entradaIncluida en cada item de fondos). El resto de entradas pedidas
  // se consideran "extra" y se cobran aparte.
  const entradasUsadasComoIncluidas = (fondos || []).reduce(
    (acc, f) => acc + (f.entradaIncluida ? f.cantidad || 0 : 0),
    0
  );
  const entradasSolas = Math.max(0, totalEntradas - entradasUsadasComoIncluidas);
  const precioFondo = modo === "delivery" ? PRECIO_FONDO_DELIVERY : PRECIO_FONDO_RECOJO;
  const totalAdicionales = (adicionales || []).reduce(
    (acc, a) => acc + (a.cantidad || 0) * (a.precio || 0),
    0
  );
  return totalFondos * precioFondo + entradasSolas * PRECIO_ENTRADA_SOLA + totalAdicionales;
}
