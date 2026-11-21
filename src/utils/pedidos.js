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
  efectivo: "#86672E",
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

// Total de un pedido para mostrar en pantalla (data.js ya lo deja calculado
// en order.total; esto es por si llega un pedido armado a mano).
export function totalDePedido(o) {
  if (Number(o.formato) >= 2) return Number(o.total) || 0;
  return calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
}

// Total estimado del carrito del cliente con los precios del menú del día.
// Es la misma cuenta que hace la base de datos al guardar el pedido
// (función validar_pedido), que es la que manda.
export function totalCarrito({ menus, entradasExtra, extras }, dia, modo) {
  if (!dia) return 0;
  const nMenus = menus.reduce((a, m) => a + m.cantidad, 0);
  const nEntradas = Object.values(entradasExtra).reduce((a, q) => a + q, 0);
  const totalExtras = extras.reduce((a, x) => a + x.cantidad * x.precio, 0);
  const precioMenu = modo === "delivery" ? dia.precioDelivery : dia.precioRecojo;
  return nMenus * precioMenu + nEntradas * dia.precioEntradaExtra + totalExtras;
}

// Total de un pedido ya armado (fondos / entradas / adicionales, como se
// guarda en la tabla) con los precios del menú de ese día. Es la misma cuenta
// que hace la base de datos (validar_pedido), que es la que manda: cada menú
// al precio de recojo o delivery, las entradas que no vienen incluidas con un
// menú al precio de entrada extra y cada adicional a su propio precio.
export function calcularTotalDia({ fondos = [], entradas = [], adicionales = [] }, dia, modo = "recojo") {
  if (!dia) return 0;
  const nMenus = sumarCantidades(fondos);
  const incluidas = fondos.reduce((a, f) => a + (f.entradaIncluida ? f.cantidad || 0 : 0), 0);
  const entradasSolas = Math.max(0, sumarCantidades(entradas) - incluidas);
  const precioMenu = modo === "delivery" ? dia.precioDelivery : dia.precioRecojo;
  const totalAdicionales = adicionales.reduce((a, x) => a + (x.cantidad || 0) * (x.precio || 0), 0);
  return nMenus * precioMenu + entradasSolas * dia.precioEntradaExtra + totalAdicionales;
}

export const soles = (n) => `S/ ${Number(n || 0).toFixed(2)}`;
