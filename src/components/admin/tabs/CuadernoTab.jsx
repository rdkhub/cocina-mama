// src/components/admin/tabs/CuadernoTab.jsx
// El cuaderno de pedidos, pero en la app: el papá escribe el cliente y lo que
// pidió (como lo haría en papel) y al tocar "Anotar" queda guardado como un
// pedido de verdad. Así entra solo a Hoy, Deben, Historial y Semanal, y todos
// (el celular del papá, la tablet, el que está en la casa) ven la misma lista
// al instante.
import { useMemo, useRef, useState } from "react";
import { NotebookPen, Plus, Loader2, Trash2, Store, MapPin, CheckCircle2, Circle, Wallet, AlertTriangle, X } from "lucide-react";
import { ConfirmDialog, EmptyState, inputStyle } from "../../ui";
import { contextoDelMenu } from "../../../lib/leerPedido";
import { interpretarFila, agregarAlTexto, faltaParaAnotar, resumenPedido } from "../../../lib/cuaderno";
import { PAY_COLORS, soles } from "../../../utils/pedidos";

const PAGOS = [
  { id: "yape", label: "Yape" },
  { id: "efectivo", label: "Efectivo" },
  { id: "fiado", label: "Debe" },
];

const VACIO = { id: null, nombre: "", texto: "", direccion: "", modo: null, pago: null };

const hora = (iso) => new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

function Chip({ activo, onClick, children, tono = "terracota" }) {
  const colores =
    tono === "aviso"
      ? "border-[#F0D28A] bg-[#FFF4D6] text-[#7A5A12]"
      : activo
        ? "border-terracota bg-terracota text-white font-semibold"
        : "border-arena bg-white text-texto-inactivo";
  return (
    <button type="button" onClick={onClick} className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-[13.5px] transition ${colores}`}>
      {children}
    </button>
  );
}

export function CuadernoTab({ todaysOrders, orders, menuHoy, platos, onCrear, onEditar, onOrderUpdate, onOrderDelete }) {
  const [fila, setFila] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [borrar, setBorrar] = useState(false);
  const nombreRef = useRef(null);
  const arribaRef = useRef(null);

  const ctx = useMemo(() => contextoDelMenu(menuHoy, platos), [menuHoy, platos]);
  const dia = menuHoy.dia;
  const sinMenu = !dia || (!ctx.segundos.length && !ctx.entradas.length && !ctx.extras.length);

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

  const interp = useMemo(
    () => interpretarFila(fila.texto, ctx, dia, { modo: fila.modo, pago: fila.pago }),
    [fila.texto, fila.modo, fila.pago, ctx, dia]
  );
  const direccion = fila.direccion || interp.direccion || (interp.modo === "delivery" ? conocido?.direccion || "" : "");
  const falta = faltaParaAnotar(fila.nombre, interp);
  const vistaPrevia = resumenPedido(interp.lineas);

  const set = (cambios) => {
    setError("");
    setFila((f) => ({ ...f, ...cambios }));
  };
  const agregar = (pedazo) => set({ texto: agregarAlTexto(fila.texto, pedazo) });

  const limpiar = () => {
    setFila(VACIO);
    setError("");
    nombreRef.current?.focus();
  };

  const anotar = async () => {
    if (falta) return setError(falta);
    setGuardando(true);
    setError("");
    const nombre = conocido?.nombre || fila.nombre.trim();
    const datos = {
      nombre,
      telefono: conocido?.telefono || "",
      ...interp.lineas,
      modo: interp.modo,
      direccion: interp.modo === "delivery" ? direccion.trim() : "",
      pago: interp.pago,
      notas: interp.notas,
      origen: "manual",
      mensajeOriginal: fila.texto.trim().slice(0, 4000),
      totalEstimado: interp.total,
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
      nombre: o.nombre,
      texto: o.mensajeOriginal || "",
      direccion: o.direccion || "",
      modo: o.modo,
      pago: o.pago,
    });
    setError("");
    arribaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const numerados = todaysOrders.map((o, i) => ({ o, n: i + 1 })).reverse();
  const totalHoy = todaysOrders.reduce((a, o) => a + o.total, 0);
  const porCobrar = todaysOrders.filter((o) => !o.pagado);
  const editando = fila.id ? numerados.find((x) => x.o.id === fila.id) : null;

  const platosRapidos = [
    ...ctx.segundos.map((s) => ({ id: s.id, nombre: s.nombre })),
    ...ctx.entradas.map((s) => ({ id: s.id, nombre: s.nombre })),
    ...ctx.extras.map((s) => ({ id: s.id, nombre: s.nombre })),
  ];

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
        <section aria-label="Anotar pedido" className={`bg-white rounded-2xl border shadow-card p-3.5 mb-4 space-y-2.5 ${editando ? "border-ocre ring-2 ring-ocre/20" : "border-[#eee2cb]"}`}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-tinta">
            <NotebookPen size={16} className="text-terracota" />
            {editando ? `Corrigiendo #${editando.n} de ${editando.o.nombre}` : "Anotar pedido"}
            {(editando || fila.nombre || fila.texto) && (
              <button type="button" onClick={limpiar} className="ml-auto text-texto-terciario p-1" aria-label="Limpiar">
                <X size={16} />
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

          <input
            className={inputStyle}
            value={fila.texto}
            onChange={(e) => set({ texto: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && anotar()}
            placeholder="¿Qué pidió? Ej: 2 aji con sopa, 1 chicha"
            autoComplete="off"
            enterKeyHint="done"
          />

          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" aria-label="Agregar plato">
            {platosRapidos.map((p) => (
              <Chip key={p.id} onClick={() => agregar(`1 ${p.nombre.toLowerCase()}`)}>
                <Plus size={12} className="inline -mt-0.5" /> {p.nombre}
              </Chip>
            ))}
          </div>

          {(vistaPrevia || interp.faltaProteina.length > 0 || interp.faltaEntrada.length > 0 || interp.dudas.length > 0) && (
            <div className="rounded-xl bg-crema px-3 py-2 space-y-1.5 text-[13.5px]">
              {vistaPrevia && <div className="text-tinta">{vistaPrevia}</div>}
              {interp.faltaProteina.map((f) => (
                <div key={f.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#7A5A12]">{f.nombre}:</span>
                  {f.opciones.map((p) => (
                    <Chip key={p} tono="aviso" onClick={() => agregar(`con ${p.toLowerCase()}`)}>
                      {p}
                    </Chip>
                  ))}
                </div>
              ))}
              {interp.faltaEntrada.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[#7A5A12]">¿Qué entrada?</span>
                  {interp.faltaEntrada.map((e) => (
                    <Chip key={e.id} tono="aviso" onClick={() => agregar(`todos con ${e.nombre.toLowerCase()}`)}>
                      {e.nombre}
                    </Chip>
                  ))}
                </div>
              )}
              {interp.dudas.map((d) => (
                <div key={d} className="text-[#7A5A12] flex gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {d}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Chip activo={interp.modo === "recojo"} onClick={() => set({ modo: "recojo" })}>
              <Store size={13} className="inline -mt-0.5" /> Llevar
            </Chip>
            <Chip activo={interp.modo === "delivery"} onClick={() => set({ modo: "delivery" })}>
              <MapPin size={13} className="inline -mt-0.5" /> Delivery
            </Chip>
            <span className="w-px bg-divisor mx-0.5" />
            {PAGOS.map((p) => (
              <Chip key={p.id} activo={interp.pago === p.id} onClick={() => set({ pago: p.id })}>
                {p.label}
              </Chip>
            ))}
          </div>

          {interp.modo === "delivery" && (
            <input className={inputStyle} value={direccion} onChange={(e) => set({ direccion: e.target.value })} placeholder="Dirección (opcional)" autoComplete="off" />
          )}

          {error && <div className="text-terracota text-[13.5px] bg-terracota/10 rounded-lg px-3 py-2">{error}</div>}

          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1">
              <div className="font-mono text-[11px] text-texto-terciario uppercase">Total</div>
              <div className="font-mono text-terracota text-lg font-semibold">{soles(interp.total)}</div>
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
        <ol className="bg-white rounded-2xl border border-[#eee2cb] shadow-card divide-y divide-divisor">
          {numerados.map(({ o, n }) => {
            const editable = o.origen === "manual" && o.mensajeOriginal;
            return (
              <li key={o.id} className={`flex gap-2 px-3 py-2.5 ${fila.id === o.id ? "bg-ocre/10" : ""}`}>
                <button
                  type="button"
                  onClick={() => (editable ? corregir(o) : null)}
                  className={`flex-1 min-w-0 text-left ${editable ? "" : "cursor-default"}`}
                  aria-label={editable ? `Corregir pedido ${n} de ${o.nombre}` : undefined}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-texto-terciario w-6 shrink-0">#{n}</span>
                    <span className="font-medium text-tinta truncate">{o.nombre}</span>
                    {o.origen === "app" && <span className="text-[10px] uppercase text-salvia border border-salvia/40 rounded-full px-1.5">Página</span>}
                    {o.origen === "whatsapp" && <span className="text-[10px] uppercase text-salvia border border-salvia/40 rounded-full px-1.5">WhatsApp</span>}
                    <span className="ml-auto font-mono text-[11px] text-texto-terciario shrink-0">{hora(o.creadoEn)}</span>
                  </div>
                  <div className="pl-8 text-[13.5px] text-[#3a332b] leading-snug">{resumenPedido(o)}</div>
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
            );
          })}
        </ol>
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
