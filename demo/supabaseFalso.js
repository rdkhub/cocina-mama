// demo/supabaseFalso.js
// Supabase de mentira, solo para ver la app en el navegador con datos
// INVENTADOS (npm run demo). Reemplaza a src/supabaseClient.js mediante un
// alias en vite.config.demo.js; nunca entra al build de producción ni toca la
// base real. Imita lo justo: tablas en memoria, el cálculo del total de
// validar_pedido y los avisos de Realtime.

const hoy = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const ahora = (min) => new Date(Date.now() - min * 60000).toISOString();
let seq = 0;
const nuevoId = () => `demo-${Date.now().toString(36)}-${seq++}`;

const plato = (id, nombre, categoria, extra = {}) => ({
  id,
  nombre,
  categoria,
  descripcion: "",
  foto_url: null,
  foto_path: null,
  fotos_proteina: {},
  requiere_proteina: false,
  permite_arroz: false,
  precio_extra: 0,
  activo: true,
  ...extra,
});

const db = {
  platos: [
    plato("p-aji", "Ají de gallina", "segundo", { permite_arroz: true }),
    plato("p-frejol", "Frejoles", "segundo", { requiere_proteina: true, permite_arroz: true }),
    plato("p-tallarin", "Tallarines verdes", "segundo", { requiere_proteina: true }),
    plato("p-lomo", "Lomo saltado", "segundo", { permite_arroz: true }),
    plato("p-sopa", "Sopa de casa", "entrada"),
    plato("p-papa", "Papa a la huancaína", "entrada"),
    plato("p-chicha", "Chicha morada (1 L)", "bebida", { precio_extra: 6 }),
    plato("p-flan", "Flan", "postre", { precio_extra: 3.5 }),
  ],
  proteinas: [
    { id: "pr-1", nombre: "Chuleta" },
    { id: "pr-2", nombre: "Pollo a la plancha" },
    { id: "pr-3", nombre: "Bistec" },
  ],
  ajustes: [{ id: 1, plantilla_saludo: "", plantilla_cierre: "" }],
  menu: [],
  menu_dia: [{ fecha: hoy, precio_recojo: 12, precio_delivery: 13, precio_entrada_extra: 3, refresco: "Maracuyá", nota: "" }],
  menu_dia_items: [
    { id: "i-1", fecha: hoy, plato_id: "p-aji", proteinas: [], agotado: false, orden: 0 },
    { id: "i-2", fecha: hoy, plato_id: "p-frejol", proteinas: ["Chuleta", "Pollo a la plancha"], agotado: false, orden: 1 },
    { id: "i-3", fecha: hoy, plato_id: "p-tallarin", proteinas: ["Bistec", "Pollo a la plancha"], agotado: false, orden: 2 },
    { id: "i-4", fecha: hoy, plato_id: "p-sopa", proteinas: [], agotado: false, orden: 3 },
    { id: "i-5", fecha: hoy, plato_id: "p-papa", proteinas: [], agotado: false, orden: 4 },
    { id: "i-6", fecha: hoy, plato_id: "p-chicha", proteinas: [], agotado: false, orden: 5 },
    { id: "i-7", fecha: hoy, plato_id: "p-flan", proteinas: [], agotado: false, orden: 6 },
  ],
  push_suscripciones: [],
  orders: [],
};

const pedido = (min, nombre, fondos, entradas, extra = {}) => ({
  id: nuevoId(),
  nombre,
  telefono: "",
  fondos,
  entradas,
  adicionales: [],
  bebida: null,
  modo: "recojo",
  direccion: "",
  pago: "yape",
  notas: "",
  fecha: hoy,
  creado_en: ahora(min),
  listo: false,
  pagado: true,
  formato: 2,
  origen: "manual",
  mensaje_original: "",
  ...extra,
});

// ---------- validar_pedido (misma cuenta que la base real) ----------
function validar(row, esNuevo) {
  if ((row.formato || 1) < 2) return null;
  const dia = db.menu_dia.find((d) => d.fecha === row.fecha);
  if (!dia) return { message: "MENU_NO_DISPONIBLE" };
  const items = db.menu_dia_items.filter((i) => i.fecha === row.fecha);
  const ids = [
    ...(row.fondos || []).flatMap((f) => [f.platoId, f.entradaId].filter(Boolean)),
    ...(row.entradas || []).map((e) => e.platoId),
    ...(row.adicionales || []).map((a) => a.platoId),
  ];
  for (const id of ids) {
    const it = items.find((i) => i.plato_id === id);
    if (!it || (esNuevo && it.agotado)) return { message: `AGOTADO: ${db.platos.find((p) => p.id === id)?.nombre || "un plato"}` };
  }
  const suma = (xs) => (xs || []).reduce((a, x) => a + Number(x.cantidad || 0), 0);
  const menus = suma(row.fondos);
  const incluidas = suma((row.fondos || []).filter((f) => f.entradaIncluida));
  row.adicionales = (row.adicionales || []).map((a) => ({ ...a, precio: db.platos.find((p) => p.id === a.platoId)?.precio_extra || 0 }));
  row.total =
    menus * (row.modo === "delivery" ? dia.precio_delivery : dia.precio_recojo) +
    Math.max(0, suma(row.entradas) - incluidas) * dia.precio_entrada_extra +
    row.adicionales.reduce((a, x) => a + x.cantidad * x.precio, 0);
  if (row.total <= 0) return { message: "PEDIDO_INVALIDO" };
  return null;
}

[
  pedido(95, "Rosa", [{ platoId: "p-aji", nombre: "Ají de gallina", cantidad: 2, arroz: "con", entradaId: "p-sopa", entradaIncluida: "Sopa de casa" }], [{ platoId: "p-sopa", nombre: "Sopa de casa", cantidad: 2 }], {
    mensaje_original: "2 aji con sopa",
  }),
  pedido(80, "Don Lucho", [{ platoId: "p-frejol", nombre: "Frejoles", cantidad: 1, proteina: "Chuleta", arroz: "con", entradaId: "p-papa", entradaIncluida: "Papa a la huancaína" }], [{ platoId: "p-papa", nombre: "Papa a la huancaína", cantidad: 1 }], {
    pago: "fiado",
    pagado: false,
    mensaje_original: "1 frejol chuleta con papa, debe",
  }),
  pedido(60, "Marta", [{ platoId: "p-tallarin", nombre: "Tallarines verdes", cantidad: 1, proteina: "Bistec" }], [], {
    origen: "app",
    modo: "delivery",
    direccion: "Jr. Los Pinos 140",
    pago: "efectivo",
  }),
].forEach((o) => {
  validar(o, true);
  db.orders.push(o);
});

// ---------- Realtime de mentira ----------
const oyentes = [];
const avisar = (tabla, eventType, fila) =>
  setTimeout(() => oyentes.filter((o) => o.tabla === tabla).forEach((o) => o.cb({ eventType, new: fila || {} })), 30);

// ---------- Consultas ----------
class Consulta {
  constructor(tabla) {
    this.tabla = tabla;
    this.filtros = [];
    this.orden = null;
    this.limite = null;
    this.accion = "select";
    this.unico = null;
    this.devolver = false;
  }
  select() {
    if (this.accion !== "select") this.devolver = true;
    return this;
  }
  eq(c, v) {
    this.filtros.push((r) => r[c] === v);
    return this;
  }
  lt(c, v) {
    this.filtros.push((r) => r[c] < v);
    return this;
  }
  order(c, opts = {}) {
    this.orden = { c, asc: opts.ascending !== false };
    return this;
  }
  limit(n) {
    this.limite = n;
    return this;
  }
  single() {
    this.unico = "single";
    return this;
  }
  maybeSingle() {
    this.unico = "maybe";
    return this;
  }
  insert(filas) {
    this.accion = "insert";
    this.filas = Array.isArray(filas) ? filas : [filas];
    return this;
  }
  update(cambios) {
    this.accion = "update";
    this.cambios = cambios;
    return this;
  }
  upsert(fila, opts = {}) {
    this.accion = "upsert";
    this.filas = [fila];
    this.claves = (opts.onConflict || "id").split(",");
    return this;
  }
  delete() {
    this.accion = "delete";
    return this;
  }
  ejecutar() {
    const t = (db[this.tabla] ||= []);
    const pasa = (r) => this.filtros.every((f) => f(r));
    let out = [];
    if (this.accion === "select") {
      out = t.filter(pasa);
      if (this.orden) {
        const { c, asc } = this.orden;
        out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
      }
      if (this.limite) out = out.slice(0, this.limite);
    } else if (this.accion === "insert") {
      for (const f of this.filas) {
        const fila = { id: nuevoId(), ...structuredClone(f) };
        if (this.tabla === "orders") {
          const err = validar(fila, true);
          if (err) return { data: null, error: err };
        }
        t.push(fila);
        out.push(fila);
        avisar(this.tabla, "INSERT", fila);
      }
    } else if (this.accion === "update") {
      for (const r of t.filter(pasa)) {
        const nueva = { ...r, ...structuredClone(this.cambios) };
        if (this.tabla === "orders" && ["fondos", "entradas", "adicionales", "modo", "fecha"].some((k) => k in this.cambios)) {
          const err = validar(nueva, false);
          if (err) return { data: null, error: err };
        }
        Object.assign(r, nueva);
        out.push(r);
        avisar(this.tabla, "UPDATE", r);
      }
    } else if (this.accion === "upsert") {
      const f = this.filas[0];
      const existe = t.find((r) => this.claves.every((k) => r[k] === f[k]));
      if (existe) Object.assign(existe, f);
      else t.push({ id: nuevoId(), ...f });
      out = [existe || t[t.length - 1]];
      avisar(this.tabla, "UPDATE", out[0]);
    } else if (this.accion === "delete") {
      const quedan = t.filter((r) => !pasa(r));
      out = t.filter(pasa);
      db[this.tabla] = quedan;
      out.forEach((r) => avisar(this.tabla, "DELETE", r));
    }
    const data = structuredClone(out);
    if (this.unico) return { data: data[0] ?? null, error: this.unico === "single" && !data.length ? { message: "no rows" } : null };
    return { data: this.accion === "select" || this.devolver ? data : null, error: null };
  }
  then(ok, mal) {
    return new Promise((r) => setTimeout(() => r(this.ejecutar()), 60)).then(ok, mal);
  }
}

export const supabase = {
  from: (tabla) => new Consulta(tabla),
  rpc: async (nombre) => ({ data: nombre === "es_admin" ? true : null, error: null }),
  functions: { invoke: async () => ({ data: null, error: { message: "Sin IA en la demo" } }) },
  auth: {
    getSession: async () => ({ data: { session: { user: { email: "demo@demo" } } } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
  channel() {
    const canal = {
      on(_evento, filtro, cb) {
        oyentes.push({ tabla: filtro.table, cb, canal });
        return canal;
      },
      subscribe: () => canal,
    };
    return canal;
  },
  removeChannel(canal) {
    for (let i = oyentes.length - 1; i >= 0; i--) if (oyentes[i].canal === canal) oyentes.splice(i, 1);
  },
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: (path) => ({ data: { publicUrl: path } }),
      remove: async () => ({ error: null }),
    }),
  },
};
