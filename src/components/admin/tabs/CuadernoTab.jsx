// src/components/admin/tabs/CuadernoTab.jsx
// El cuaderno de pedidos, con botones. Se arma un plato a la vez: se toca el
// plato, se elige cuántos, la entrada, la proteína y el arroz, y "Agregar al
// pedido" lo pone en la lista de lo que lleva (con su detalle y su precio).
// Otro igual pero distinto (ej. 1 lomo con tequeños) se arma aparte; nada se
// junta solo. Abajo: extras, adicionales (huevo, presa extra…) y notas.
// Al tocar "Anotar" queda guardado como un pedido de verdad: entra a Hoy,
// Deben, Historial y Semanal, y todos los celulares lo ven al instante.
// Cualquier pedido de hoy (de la página, de WhatsApp o a mano) se puede corregir.
import { useEffect, useMemo, useRef, useState } from "react";
import { NotebookPen, Plus, Minus, Loader2, Trash2, Store, MapPin, CheckCircle2, Circle, Wallet, X, Keyboard, Pencil } from "lucide-react";
import { ConfirmDialog, EmptyState, inputStyle } from "../../ui";
import { contextoDelMenu } from "../../../lib/leerPedido";
import {
  interpretarFila,
  resumenPedido,
  nuevaLinea,
  armarDesdeBotones,
  estadoDesdePedido,
  ESTADO_VACIO,
  contextoCuaderno,
  faltaEnLinea,
  textoLinea,
  precioLinea,
} from "../../../lib/cuaderno";
import { PAY_COLORS, soles } from "../../../utils/pedidos";

const PAGOS = [
  { id: "yape", label: "Yape" },
  { id: "efectivo", label: "Efectivo" },
  { id: "fiado", label: "Debe" },
];

const VACIO = { id: null, original: null, nombre: "", direccion: "", modo: "recojo", pago: null, notas: "", ...ESTADO_VACIO };

const hora = (iso) => new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

function Chip({ activo, onClick, children, tono = "terracota", aviso }) {
  const colores = activo
    ? tono === "salvia"
      ? "border-salvia bg-salvia text-white font-semibold"
      : "border-terracota bg-terracota text-white font-semibold"
    : aviso
      ? "border-[#F0D28A] bg-[#FFF4D6] text-[#7A5A12]"
      : "border-arena bg-white text-texto-inactivo";
  return (
    <button type="button" onClick={onClick} aria-pressed={!!activo} className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-[13.5px] transition active:scale-95 ${colores}`}>
      {children}
    </button>
  );
}

// − cantidad +. Con minimo=0, en 1 el − se vuelve tacho para quitarlo.
function Contador({ cantidad, onCambiar, nombre, minimo = 0 }) {
  const tacho = minimo === 0 && cantidad <= 1;
  return (
    <div className="flex items-center gap-1 bg-crema rounded-full p-1 shrink-0">
      <button
        type="button"
        onClick={() => onCambiar(-1)}
        disabled={cantidad <= minimo}
        aria-label={tacho ? `Quitar ${nombre}` : `Uno menos de ${nombre}`}
        className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-texto-secundario active:scale-90 transition disabled:opacity-40"
      >
        {tacho ? <Trash2 size={15} /> : <Minus size={15} />}
      </button>
      <span className="w-6 text-center font-bold text-[16px] text-tinta tabular-nums">{cantidad}</span>
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label={`Uno más de ${nombre}`}
        className="w-9 h-9 rounded-full bg-terracota text-white flex items-center justify-center active:scale-90 transition"
      >
        <Plus size={15} strokeWidth={2.6} />
      </button>
    </div>
  );
}

function Fila({ titulo, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12.5px] font-semibold text-etiqueta w-full">{titulo}</span>
      {children}
    </div>
  );
}

export function CuadernoTab({ todaysOrders, orders, menuHoy, platos, onCrear, onEditar, onOrderUpdate, onOrderDelete, editarId, onEditarCargado }) {
  const [fila, setFila] = useState(VACIO);
  // El plato que se está armando (todavía no está en el pedido). editaKey:
  // si se tocó "Cambiar" en una línea, vuelve a su mismo lugar.
  const [armando, setArmando] = useState(null);
  const [rapido, setRapido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [borrar, setBorrar] = useState(false);
  const nombreRef = useRef(null);
  const arribaRef = useRef(null);

  // Con lo agotado (para corregir pedidos viejos) y con los adicionales fijos.
  const ctx = useMemo(() => contextoCuaderno(contextoDelMenu(menuHoy, platos, { conAgotados: true }), platos), [menuHoy, platos]);
  const dia = menuHoy.dia;
  const sinMenu = !dia || (!ctx.segundos.length && !ctx.entradas.length && !ctx.extras.length);
  const segPorId = useMemo(() => new Map(ctx.segundos.map((s) => [s.id, s])), [ctx]);

  // Clientes de pedidos anteriores: el nombre se autocompleta y se reutiliza
  // el mismo teléfono, para que sus deudas e historial queden juntos.
  const clientes = useMemo(() => {
    const m = new Map();
    [...orders].reverse().forEach((o) => {
      const clave = (o.nombre || "").trim().toLowerCase();
      if (clave && !m.has(clave)) m.set(clave, { nombre: o.nombre.trim(), telefono: o.telefono || "", direccion: o.direccion || "" });
    });
    return m;
  }, [orders]);
  const conocido = clientes.get(fila.nombre.trim().toLowerCase());

  const pedido = useMemo(() => armarDesdeBotones(fila, ctx, dia, fila.modo), [fila, ctx, dia]);
  const direccion = fila.direccion || (fila.modo === "delivery" ? conocido?.direccion || "" : "");

  const set = (cambios) => {
    setError("");
    setFila((f) => ({ ...f, ...cambios }));
  };
  const cambiarArmando = (cambios) => {
    setError("");
    setArmando((a) => ({ ...a, ...cambios }));
  };
  const sumarEn = (campo, id, d) => {
    const n = Math.max(0, (fila[campo][id] || 0) + d);
    const copia = { ...fila[campo], [id]: n };
    if (!n) delete copia[id];
    set({ [campo]: copia });
  };

  // Tocar un plato empieza a armarlo (si ya se estaba armando otro sin
  // agregar, se reemplaza).
  const elegirPlato = (s) => {
    setError("");
    if (armando?.segundoId === s.id && !armando.editaKey) return;
    setArmando(nuevaLinea(s, ctx));
  };

  // El plato armado pasa a la lista. Devuelve los menús nuevos (o null si falta algo).
  const pasarAlPedido = (menus = fila.menus) => {
    if (!armando) return menus;
    const falta = faltaEnLinea(armando, ctx);
    if (falta) {
      setError(falta);
      return null;
    }
    const { editaKey, ...linea } = armando;
    const i = editaKey ? menus.findIndex((m) => m.key === editaKey) : -1;
    const nuevos = i >= 0 ? menus.map((m, j) => (j === i ? linea : m)) : [...menus, linea];
    setArmando(null);
    return nuevos;
  };
  const agregarArmado = () => {
    const menus = pasarAlPedido();
    if (menus) set({ menus });
  };

  const cambiarLinea = (m) => {
    setError("");
    setArmando({ ...m, editaKey: m.key });
  };
  const quitarLinea = (key) => {
    if (armando?.editaKey === key) setArmando(null);
    set({ menus: fila.menus.filter((m) => m.key !== key) });
  };

  // "Escribir rápido": el texto se lee y se convierte en líneas.
  const agregarEscrito = () => {
    const t = rapido.trim();
    if (!t) return;
    const r = interpretarFila(t, ctx, dia);
    const extra = estadoDesdePedido(r.lineas, ctx);
    if (!extra.menus.length && !Object.keys(extra.extras).length && !Object.keys(extra.entradasExtra).length) {
      setError(r.dudas[0] || "No reconocí ningún plato del menú de hoy.");
      return;
    }
    const juntar = (a, b) => {
      const c = { ...a };
      Object.entries(b).forEach(([k, v]) => (c[k] = (c[k] || 0) + v));
      return c;
    };
    // Lo que el texto no dejó claro se marca para elegirlo con botones.
    const menus = extra.menus.map((m) => {
      const s = segPorId.get(m.segundoId);
      const dijoEntrada = r.lineas.fondos.find((f) => f.platoId === m.segundoId)?.entradaId;
      return { ...m, entradaId: dijoEntrada ? m.entradaId : ctx.entradas.length === 1 ? ctx.entradas[0].id : ctx.entradas.length ? null : "sin", arroz: s?.permiteArroz ? m.arroz || "con" : null };
    });
    set({
      menus: [...fila.menus, ...menus],
      extras: juntar(fila.extras, extra.extras),
      entradasExtra: juntar(fila.entradasExtra, extra.entradasExtra),
      ...(r.pago && !fila.pago ? { pago: r.pago } : {}),
      ...(/\b(deli|delivery)\b/i.test(t) ? { modo: "delivery" } : {}),
    });
    setRapido("");
  };

  const limpiar = () => {
    setFila(VACIO);
    setArmando(null);
    setRapido("");
    setError("");
    nombreRef.current?.focus();
  };

  const anotar = async () => {
    if (!fila.nombre.trim()) return setError("Escribe el nombre del cliente.");
    // Si quedó un plato armado sin agregar, se agrega solo.
    const menus = pasarAlPedido();
    if (!menus) return;
    const estado = { ...fila, menus };
    const final = armarDesdeBotones(estado, ctx, dia, fila.modo);
    if (final.vacio) return setError("Toca un plato para agregarlo.");
    if (final.falta) return setError(final.falta);
    if (!fila.pago) return setError("Elige cómo paga.");
    setFila(estado);
    setGuardando(true);
    setError("");
    const o = fila.original;
    const datos = {
      nombre: conocido?.nombre || fila.nombre.trim(),
      // Al corregir se conserva lo que el pedido ya tenía (teléfono del
      // cliente de la página, mensaje original de WhatsApp).
      telefono: o?.telefono || conocido?.telefono || "",
      ...final.lineas,
      modo: fila.modo,
      direccion: fila.modo === "delivery" ? direccion.trim() : "",
      pago: fila.pago,
      notas: fila.notas.trim().slice(0, 500),
      origen: o?.origen || "manual",
      mensajeOriginal: o && o.origen !== "manual" ? o.mensajeOriginal : resumenPedido(final.lineas).slice(0, 4000),
      totalEstimado: final.total,
    };
    try {
      if (fila.id) await onEditar(fila.id, datos);
      else await onCrear(datos);
      limpiar();
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const corregir = (o) => {
    setFila({
      id: o.id,
      original: o,
      nombre: o.nombre,
      direccion: o.direccion || "",
      modo: o.modo || "recojo",
      pago: o.pago,
      notas: o.notas || "",
      ...estadoDesdePedido(o, ctx),
    });
    setArmando(null);
    setRapido("");
    setError("");
    arribaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Llegó desde Hoy con "Corregir": se carga ese pedido (durante el render,
  // igual que en AdminView) y se sube a verlo.
  const [editarVisto, setEditarVisto] = useState(null);
  if (!editarId && editarVisto) setEditarVisto(null);
  if (editarId && editarId !== editarVisto) {
    setEditarVisto(editarId);
    const o = todaysOrders.find((x) => x.id === editarId);
    if (o) {
      setFila({ id: o.id, original: o, nombre: o.nombre, direccion: o.direccion || "", modo: o.modo || "recojo", pago: o.pago, notas: o.notas || "", ...estadoDesdePedido(o, ctx) });
      setArmando(null);
      setError("");
    }
  }
  useEffect(() => {
    if (!editarId) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    onEditarCargado?.();
  }, [editarId, onEditarCargado]);

  const numerados = todaysOrders.map((o, i) => ({ o, n: i + 1 })).reverse();
  const totalHoy = todaysOrders.reduce((a, o) => a + o.total, 0);
  const porCobrar = todaysOrders.filter((o) => !o.pagado);
  const editando = fila.id ? numerados.find((x) => x.o.id === fila.id) : null;
  const cuantosDe = (id) => fila.menus.filter((m) => m.segundoId === id).reduce((a, m) => a + m.cantidad, 0);
  const hayAlgo = fila.menus.length || armando || Object.keys(fila.extras).length || Object.keys(fila.entradasExtra).length || fila.notas;
  const sArmando = armando ? segPorId.get(armando.segundoId) : null;
  // El total cuenta también el plato que se está armando.
  const totalVista = pedido.total + (armando ? precioLinea(armando, dia, fila.modo) : 0);
  const entradasPara = (m) => ctx.entradas.filter((e) => !e.agotado || e.id === m.entradaId);

  const extrasHoy = ctx.extras.filter((x) => !x.fijo && (!x.agotado || fila.extras[x.id]));
  const fijos = ctx.extras.filter((x) => x.fijo);
  const filaAparte = (x) => {
    const n = fila[x.campo][x.id] || 0;
    return (
      <div key={x.campo + x.id} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border-2 ${n ? "border-terracota bg-terracota-suave" : "border-transparent bg-crema/60"}`}>
        <div className="flex-1 min-w-0 text-[14px] text-tinta leading-snug">
          {x.nombre} <span className="text-[12.5px] text-texto-secundario whitespace-nowrap">{soles(x.precio)} c/u</span>
        </div>
        {n > 0 ? (
          <Contador cantidad={n} nombre={x.nombre} onCambiar={(d) => sumarEn(x.campo, x.id, d)} />
        ) : (
          <button
            type="button"
            onClick={() => sumarEn(x.campo, x.id, 1)}
            aria-label={`Agregar ${x.nombre}`}
            className="w-9 h-9 rounded-full bg-terracota text-white flex items-center justify-center active:scale-90 transition"
          >
            <Plus size={15} strokeWidth={2.6} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="pb-10" ref={arribaRef}>
      <div className="bg-gradient-to-b from-tinta-media to-tinta-oscura rounded-2xl px-4 py-3 mb-3 flex items-center justify-between text-[13px]">
        <span className="text-[#cfc3ad]">
          <b className="text-crema">{todaysOrders.length}</b> pedidos hoy
          {porCobrar.length > 0 && (
            <>
              {" · "}
              <b className="text-dorado">{porCobrar.length}</b> por cobrar
            </>
          )}
        </span>
        <span className="text-dorado text-lg font-semibold font-mono">{soles(totalHoy)}</span>
      </div>

      {sinMenu ? (
        <div className="bg-terracota/10 text-terracota text-[13.5px] rounded-xl px-3.5 py-3 mb-4">Primero publica el menú de hoy en la pestaña Menú.</div>
      ) : (
        <section aria-label="Anotar pedido" className={`bg-white rounded-2xl border shadow-card p-3.5 mb-4 space-y-3 ${editando ? "border-ocre ring-2 ring-ocre/20" : "border-[#eee2cb]"}`}>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-tinta">
            <NotebookPen size={16} className="text-terracota" />
            {editando ? `Corrigiendo #${editando.n} de ${editando.o.nombre}` : "Anotar pedido"}
            {(editando || fila.nombre || hayAlgo) && (
              <button type="button" onClick={limpiar} className="ml-auto text-texto-terciario p-1" aria-label="Empezar de nuevo">
                <X size={17} />
              </button>
            )}
          </div>

          <input
            ref={nombreRef}
            className={inputStyle}
            list="cuaderno-clientes"
            value={fila.nombre}
            onChange={(e) => set({ nombre: e.target.value })}
            placeholder="Cliente"
            autoComplete="off"
            enterKeyHint="next"
          />
          <datalist id="cuaderno-clientes">
            {Array.from(clientes.values()).map((c) => (
              <option key={c.nombre} value={c.nombre} />
            ))}
          </datalist>

          {/* 1. Elegir el plato */}
          <div>
            <div className="text-[12.5px] font-semibold text-etiqueta mb-1.5">{fila.menus.length ? "¿Otro plato? Tócalo" : "Toca el plato"}</div>
            <div className="grid grid-cols-2 gap-2">
              {ctx.segundos
                .filter((s) => !s.agotado)
                .map((s) => {
                  const n = cuantosDe(s.id);
                  const elegido = armando?.segundoId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => elegirPlato(s)}
                      aria-pressed={elegido}
                      className={`relative text-left rounded-xl border-2 px-3 py-2.5 text-[14px] font-semibold leading-snug transition active:scale-[0.97] ${
                        elegido ? "border-terracota bg-terracota text-white" : n ? "border-terracota/50 bg-terracota-suave text-tinta" : "border-arena bg-white text-tinta"
                      }`}
                    >
                      {s.nombre}
                      {n > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-tinta text-white text-[12px] font-bold flex items-center justify-center">
                          {n}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* 2. Armar ese plato: cuántos y cómo; luego "Agregar al pedido" */}
          {armando && sArmando && (
            <div className="rounded-2xl border-2 border-terracota bg-terracota-suave/60 p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 font-semibold text-[15px] text-tinta leading-snug">{sArmando.nombre}</div>
                <Contador cantidad={armando.cantidad} minimo={1} nombre={sArmando.nombre} onCambiar={(d) => cambiarArmando({ cantidad: Math.max(1, armando.cantidad + d) })} />
              </div>
              {ctx.entradas.length > 0 && (
                <Fila titulo="Entrada">
                  {entradasPara(armando).map((e) => (
                    <Chip key={e.id} tono="salvia" activo={armando.entradaId === e.id} aviso={!armando.entradaId} onClick={() => cambiarArmando({ entradaId: e.id })}>
                      {e.nombre}
                    </Chip>
                  ))}
                  <Chip tono="salvia" activo={armando.entradaId === "sin"} aviso={!armando.entradaId} onClick={() => cambiarArmando({ entradaId: "sin" })}>
                    Sin entrada
                  </Chip>
                </Fila>
              )}
              {sArmando.requiereProteina && (
                <Fila titulo="Proteína">
                  {sArmando.proteinas.map((p) => (
                    <Chip key={p} activo={armando.proteina === p} aviso={!armando.proteina} onClick={() => cambiarArmando({ proteina: p })}>
                      {p}
                    </Chip>
                  ))}
                </Fila>
              )}
              {sArmando.permiteArroz && (
                <Fila titulo="Arroz">
                  <Chip tono="salvia" activo={armando.arroz !== "sin"} onClick={() => cambiarArmando({ arroz: "con" })}>
                    Con arroz
                  </Chip>
                  <Chip tono="salvia" activo={armando.arroz === "sin"} onClick={() => cambiarArmando({ arroz: "sin" })}>
                    Sin arroz
                  </Chip>
                </Fila>
              )}
              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setArmando(null)}
                  className="rounded-xl border-2 border-arena bg-white px-3 py-2.5 text-[14px] font-semibold text-texto-secundario"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={agregarArmado}
                  className="flex-1 rounded-xl bg-tinta text-white px-3 py-2.5 text-[14.5px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus size={16} strokeWidth={2.6} /> {armando.editaKey ? "Guardar cambio" : "Agregar al pedido"}
                </button>
              </div>
            </div>
          )}

          {/* 3. Lo que lleva el pedido: cada línea con su detalle y su precio */}
          {fila.menus.length > 0 && (
            <div>
              <div className="text-[12.5px] font-semibold text-etiqueta mb-1.5">Este pedido lleva</div>
              <ul className="rounded-xl border-2 border-[#eee2cb] divide-y divide-divisor bg-white">
                {fila.menus.map((m) => {
                  const falta = faltaEnLinea(m, ctx);
                  const cambiando = armando?.editaKey === m.key;
                  return (
                    <li key={m.key} className={`flex items-center gap-1 pl-3 pr-1 py-1.5 ${cambiando ? "bg-ocre/10" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] text-tinta leading-snug">{textoLinea(m, ctx)}</div>
                        {falta ? (
                          <div className="text-[12px] text-[#7A5A12]">{falta} Toca el lápiz.</div>
                        ) : (
                          <div className="text-[12px] font-mono text-texto-secundario">{soles(precioLinea(m, dia, fila.modo))}</div>
                        )}
                      </div>
                      <button type="button" onClick={() => cambiarLinea(m)} aria-label={`Cambiar ${textoLinea(m, ctx)}`} className="w-11 h-11 flex items-center justify-center text-texto-secundario">
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => quitarLinea(m.key)} aria-label={`Quitar ${textoLinea(m, ctx)}`} className="w-11 h-11 flex items-center justify-center text-arena-hover hover:text-terracota">
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 4. Aparte: extras del día y entradas sueltas */}
          {(extrasHoy.length > 0 || ctx.entradas.length > 0) && (
            <div>
              <div className="text-[12.5px] font-semibold text-etiqueta mb-1.5">Aparte</div>
              <div className="space-y-1.5">
                {[
                  ...extrasHoy.map((x) => ({ campo: "extras", id: x.id, nombre: x.nombre, precio: x.precio })),
                  ...ctx.entradas
                    .filter((x) => !x.agotado || fila.entradasExtra[x.id])
                    .map((x) => ({ campo: "entradasExtra", id: x.id, nombre: `${x.nombre} (extra)`, precio: dia?.precioEntradaExtra })),
                ].map(filaAparte)}
              </div>
            </div>
          )}

          {/* 5. Adicionales de siempre (huevo sancochado, presa extra…), del catálogo */}
          {fijos.length > 0 && (
            <div>
              <div className="text-[12.5px] font-semibold text-etiqueta mb-1.5">Adicionales</div>
              <div className="space-y-1.5">{fijos.map((x) => filaAparte({ campo: "extras", id: x.id, nombre: x.nombre, precio: x.precio }))}</div>
            </div>
          )}

          {/* Notas: lo que no está en los botones */}
          <div>
            <label htmlFor="cuaderno-notas" className="text-[12.5px] font-semibold text-etiqueta mb-1.5 block">
              Notas (opcional)
            </label>
            <textarea
              id="cuaderno-notas"
              className={`${inputStyle} min-h-[64px] resize-y`}
              value={fila.notas}
              onChange={(e) => set({ notas: e.target.value })}
              placeholder="Ej: un plato que no está en el menú, sin cebolla, recoge a la 1…"
              maxLength={500}
            />
          </div>

          {/* Escribir rápido (opcional) */}
          <details className="group">
            <summary className="list-none cursor-pointer select-none text-[13px] font-semibold text-texto-secundario flex items-center gap-1.5">
              <Keyboard size={15} /> Escribir rápido
            </summary>
            <div className="flex gap-2 mt-2">
              <input
                className={inputStyle}
                value={rapido}
                onChange={(e) => setRapido(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarEscrito()}
                placeholder="Ej: 2 aji con sopa, 1 chicha"
                autoComplete="off"
                enterKeyHint="done"
              />
              <button type="button" onClick={agregarEscrito} className="shrink-0 rounded-lg bg-tinta text-white px-3 text-[14px] font-semibold">
                Agregar
              </button>
            </div>
          </details>

          <div className="flex flex-wrap gap-1.5">
            <Chip activo={fila.modo === "recojo"} onClick={() => set({ modo: "recojo" })}>
              <Store size={13} className="inline -mt-0.5" /> Llevar
            </Chip>
            <Chip activo={fila.modo === "delivery"} onClick={() => set({ modo: "delivery" })}>
              <MapPin size={13} className="inline -mt-0.5" /> Delivery
            </Chip>
            <span className="w-px bg-divisor mx-0.5" />
            {PAGOS.map((p) => (
              <Chip key={p.id} activo={fila.pago === p.id} onClick={() => set({ pago: p.id })}>
                {p.label}
              </Chip>
            ))}
          </div>

          {fila.modo === "delivery" && (
            <input className={inputStyle} value={direccion} onChange={(e) => set({ direccion: e.target.value })} placeholder="Dirección (opcional)" autoComplete="off" />
          )}

          {error && <div className="text-terracota text-[13.5px] bg-terracota/10 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1">
              <div className="text-[11px] text-texto-terciario uppercase font-semibold">Total</div>
              <div className="font-mono text-terracota text-lg font-semibold">{soles(totalVista)}</div>
            </div>
            {editando && (
              <button type="button" onClick={() => setBorrar(true)} className="p-3 text-arena-hover hover:text-terracota" aria-label="Borrar este pedido">
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={anotar}
              disabled={guardando}
              className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white rounded-xl px-6 py-3 text-[15px] font-semibold flex items-center gap-2"
            >
              {guardando && <Loader2 size={16} className="animate-spin" />}
              {editando ? "Guardar" : "Anotar"}
            </button>
          </div>
        </section>
      )}

      {numerados.length === 0 ? (
        <EmptyState text="Todavía no hay pedidos hoy. Anota el primero arriba: el cliente y lo que pidió." />
      ) : (
        <>
          <p className="text-[12.5px] text-texto-secundario mb-1.5 px-1">Toca un pedido para corregirlo.</p>
          <ol className="bg-white rounded-2xl border border-[#eee2cb] shadow-card divide-y divide-divisor">
            {numerados.map(({ o, n }) => (
              <li key={o.id} className={`flex gap-2 px-3 py-2.5 ${fila.id === o.id ? "bg-ocre/10" : ""}`}>
                <button type="button" onClick={() => corregir(o)} className="flex-1 min-w-0 text-left" aria-label={`Corregir pedido ${n} de ${o.nombre}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-texto-terciario w-6 shrink-0">#{n}</span>
                    <span className="font-medium text-tinta truncate">{o.nombre}</span>
                    {o.origen === "app" && <span className="text-[10px] uppercase text-salvia border border-salvia/40 rounded-full px-1.5">Página</span>}
                    {o.origen === "whatsapp" && <span className="text-[10px] uppercase text-salvia border border-salvia/40 rounded-full px-1.5">WhatsApp</span>}
                    <span className="ml-auto font-mono text-[11px] text-texto-terciario shrink-0">{hora(o.creadoEn)}</span>
                  </div>
                  <div className="pl-8 text-[13.5px] text-[#3a332b] leading-snug">{resumenPedido(o)}</div>
                  {o.notas && <div className="pl-8 text-[12.5px] text-ocre italic leading-snug">“{o.notas}”</div>}
                  <div className="pl-8 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                    <span className="text-texto-secundario">{o.modo === "delivery" ? `Delivery${o.direccion ? `: ${o.direccion}` : ""}` : "Llevar"}</span>
                    {o.pago !== "fiado" && (
                      <span style={{ color: PAY_COLORS[o.pago] }} className="font-medium">
                        {PAGOS.find((p) => p.id === o.pago)?.label}
                      </span>
                    )}
                    <span className="font-mono text-terracota font-semibold">{soles(o.total)}</span>
                  </div>
                </button>
                <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOrderUpdate(o.id, { pagado: !o.pagado })}
                    className={`text-[12px] font-medium flex items-center gap-1 rounded-full px-2 py-1 ${o.pagado ? "text-salvia" : "text-terracota bg-terracota/10"}`}
                  >
                    <Wallet size={13} /> {o.pagado ? "Pagó" : "Debe"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOrderUpdate(o.id, { listo: !o.listo })}
                    className={`text-[12px] font-medium flex items-center gap-1 px-2 py-1 ${o.listo ? "text-salvia" : "text-texto-terciario"}`}
                  >
                    {o.listo ? <CheckCircle2 size={13} /> : <Circle size={13} />} {o.listo ? "Listo" : "Listo?"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <ConfirmDialog
        open={borrar}
        title="¿Borrar este pedido?"
        message={`Se eliminará el pedido de ${editando?.o.nombre || ""}. No se puede deshacer.`}
        confirmLabel="Sí, borrar"
        cancelLabel="Cancelar"
        onCancel={() => setBorrar(false)}
        onConfirm={() => {
          setBorrar(false);
          if (fila.id) onOrderDelete(fila.id);
          limpiar();
        }}
      />
    </div>
  );
}
