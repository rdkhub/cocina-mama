// src/lib/deudas.js
// "Deben" ordenado por semana (lunes a domingo) y, dentro de cada semana, por
// cliente. Así no es una lista larguísima: se abre la semana, luego el cliente,
// y se ven sus pedidos día por día.

// (Copias chicas de data.js, para no cargar Supabase en los tests.)
const keyToDate = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const fechaKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Lunes de la semana de una fecha "YYYY-MM-DD" (también "YYYY-MM-DD").
export function lunesDe(fecha) {
  const d = keyToDate(fecha);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fechaKey(d);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// "17 – 23 nov" o "29 dic – 4 ene".
export function etiquetaSemana(lunes) {
  const a = keyToDate(lunes);
  const b = keyToDate(lunes);
  b.setDate(b.getDate() + 6);
  const ia = `${a.getDate()}${a.getMonth() === b.getMonth() ? "" : " " + MESES[a.getMonth()]}`;
  return `${ia} – ${b.getDate()} ${MESES[b.getMonth()]}`;
}

// "Lun 17"
export const etiquetaDia = (fecha) => {
  const d = keyToDate(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()}`;
};

const menusDe = (p) => (p.fondos || []).reduce((a, f) => a + (f.cantidad || 0), 0);

// deudaList: [{ nombre, telefono, pedidos: [{ id, fecha, total, fondos, ... }] }]
// Devuelve las semanas de la más nueva a la más vieja:
// [{ lunes, etiqueta, monto, pedidos, menus, clientes: [{ clave, nombre, telefono,
//    monto, pedidos: [...] (por fecha), menus }] }]
// Los clientes van del que más debe al que menos.
export function deudasPorSemana(deudaList = []) {
  const semanas = new Map();
  for (const d of deudaList) {
    const clave = `${d.nombre}|${d.telefono || ""}`;
    for (const p of d.pedidos || []) {
      const lunes = lunesDe(p.fecha);
      if (!semanas.has(lunes)) semanas.set(lunes, new Map());
      const clientes = semanas.get(lunes);
      if (!clientes.has(clave)) clientes.set(clave, { clave, nombre: d.nombre, telefono: d.telefono || "", monto: 0, menus: 0, pedidos: [] });
      const c = clientes.get(clave);
      c.pedidos.push(p);
      c.monto += Number(p.total) || 0;
      c.menus += menusDe(p);
    }
  }
  return Array.from(semanas, ([lunes, clientes]) => {
    const lista = Array.from(clientes.values())
      .map((c) => ({ ...c, monto: Math.round(c.monto * 100) / 100, pedidos: c.pedidos.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0)) }))
      .sort((a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre));
    return {
      lunes,
      etiqueta: etiquetaSemana(lunes),
      monto: Math.round(lista.reduce((a, c) => a + c.monto, 0) * 100) / 100,
      pedidos: lista.reduce((a, c) => a + c.pedidos.length, 0),
      menus: lista.reduce((a, c) => a + c.menus, 0),
      clientes: lista,
    };
  }).sort((a, b) => (a.lunes < b.lunes ? 1 : -1));
}
