// src/components/admin/NuevoPedidoSheet.jsx
// Registrar un pedido que llegó por WhatsApp (o por teléfono, o en persona).
// Paso 1: el papá comparte o pega el mensaje y la app lo lee.
// Paso 2: revisa el pedido armado, corrige lo que haga falta y lo guarda.
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, ClipboardPaste, Sparkles, PenLine, Plus, Minus, Trash2, AlertTriangle, MessageCircle, Store, MapPin } from "lucide-react";
import { Sheet, Field, inputStyle, SelectCard } from "../ui";
import { leerPedido, contextoDelMenu } from "../../lib/leerPedido";
import { armarLineas } from "../../lib/cuaderno";
import { PAY_LABELS, soles } from "../../utils/pedidos";

let contador = 0;
const k = () => `l${Date.now()}_${contador++}`;

const FORM_VACIO = {
  nombre: "",
  telefono: "",
  menus: [],
  entradasExtra: [],
  adicionales: [],
  modo: "recojo",
  direccion: "",
  pago: null,
  notas: "",
};

function Cantidad({ valor, onCambiar }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onCambiar(Math.max(1, valor - 1))}
        className="w-8 h-8 rounded-full border border-arena-oscura text-texto-secundario flex items-center justify-center"
        aria-label="Uno menos"
      >
        <Minus size={14} />
      </button>
      <span className="w-5 text-center font-semibold text-terracota">{valor}</span>
      <button
        type="button"
        onClick={() => onCambiar(Math.min(30, valor + 1))}
        className="w-8 h-8 rounded-full bg-terracota text-white flex items-center justify-center"
        aria-label="Uno más"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export function NuevoPedidoSheet({ open, onClose, textoInicial = "", menuHoy, platos, orders, onGuardar, showToast }) {
  const [paso, setPaso] = useState("mensaje"); // mensaje | revisar
  const [texto, setTexto] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [dudas, setDudas] = useState([]);
  const [fuente, setFuente] = useState(null); // ia | local | manual
  const [error, setError] = useState("");

  const ctx = useMemo(() => contextoDelMenu(menuHoy, platos), [menuHoy, platos]);
  const dia = menuHoy.dia;

  // Clientes de pedidos anteriores, para autocompletar nombre y teléfono.
  const clientes = useMemo(() => {
    const m = new Map();
    [...orders].reverse().forEach((o) => {
      const clave = (o.nombre || "").trim().toLowerCase();
      if (clave && !m.has(clave)) m.set(clave, { nombre: o.nombre.trim(), telefono: o.telefono || "", direccion: o.direccion || "" });
    });
    return Array.from(m.values());
  }, [orders]);

  const empezar = (t) => {
    setPaso("mensaje");
    setTexto(t || "");
    setForm(FORM_VACIO);
    setDudas([]);
    setFuente(null);
    setError("");
  };

  const leer = async (t = texto) => {
    if (!t.trim()) return;
    setLeyendo(true);
    try {
      const r = await leerPedido(t, ctx);
      const conocido = clientes.find((c) => c.nombre.toLowerCase() === r.nombre.toLowerCase());
      setForm({
        nombre: r.nombre || "",
        telefono: r.telefono || conocido?.telefono || "",
        menus: r.menus.map((m) => ({ ...m, key: k() })),
        entradasExtra: r.entradasExtra.map((e) => ({ ...e, key: k() })),
        adicionales: r.adicionales.map((e) => ({ ...e, key: k() })),
        modo: r.modo || "recojo",
        direccion: r.direccion || (r.modo === "delivery" ? conocido?.direccion || "" : ""),
        pago: r.pago,
        notas: r.notas || "",
      });
      const usaDireccionAnterior = r.modo === "delivery" && !r.direccion && conocido?.direccion;
      setDudas(
        usaDireccionAnterior
          ? [...r.dudas.filter((d) => !d.includes("dirección")), "Usé la dirección de su último pedido; confírmala."]
          : r.dudas
      );
      setFuente(r.fuente);
      setPaso("revisar");
    } finally {
      setLeyendo(false);
    }
  };

  // Al abrir: si viene un mensaje compartido desde WhatsApp, se lee solo.
  useEffect(() => {
    if (!open) return;
    empezar(textoInicial);
    if (textoInicial.trim()) leer(textoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, textoInicial]);

  const llenarAMano = () => {
    setForm({ ...FORM_VACIO, menus: ctx.segundos.length ? [nuevoMenu()] : [] });
    setDudas([]);
    setFuente("manual");
    setPaso("revisar");
  };

  const pegar = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setTexto(t);
    } catch {
      showToast("No se pudo pegar. Mantén presionado el cuadro y elige Pegar.");
    }
  };

  const nuevoMenu = () => {
    const s = ctx.segundos[0];
    return { key: k(), segundoId: s?.id || "", proteina: "", entradaId: ctx.entradas.length === 1 ? ctx.entradas[0].id : null, arroz: s?.permiteArroz ? "con" : null, cantidad: 1 };
  };

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const cambiarFila = (lista, key, cambios) =>
    setForm((f) => ({ ...f, [lista]: f[lista].map((x) => (x.key === key ? { ...x, ...cambios } : x)) }));
  const quitarFila = (lista, key) => setForm((f) => ({ ...f, [lista]: f[lista].filter((x) => x.key !== key) }));

  const segPorId = useMemo(() => new Map(ctx.segundos.map((s) => [s.id, s])), [ctx]);
  const extPorId = useMemo(() => new Map(ctx.extras.map((s) => [s.id, s])), [ctx]);

  const nMenus = form.menus.reduce((a, m) => a + m.cantidad, 0);
  const nEntExtra = form.entradasExtra.reduce((a, m) => a + m.cantidad, 0);
  const total =
    nMenus * (form.modo === "delivery" ? dia?.precioDelivery ?? 0 : dia?.precioRecojo ?? 0) +
    nEntExtra * (dia?.precioEntradaExtra ?? 0) +
    form.adicionales.reduce((a, x) => a + x.cantidad * (extPorId.get(x.id)?.precio || 0), 0);

  const faltaProteina = form.menus.some((m) => {
    const s = segPorId.get(m.segundoId);
    return s?.requiereProteina && !m.proteina;
  });

  const guardar = async () => {
    setError("");
    if (!form.nombre.trim()) return setError("Pon el nombre del cliente (para las cuentas).");
    if (!nMenus && !nEntExtra && !form.adicionales.length) return setError("El pedido está vacío.");
    if (form.menus.some((m) => !segPorId.has(m.segundoId))) return setError("Elige el segundo de cada menú.");
    if (faltaProteina) return setError("Falta elegir la proteína de algún plato.");
    if (form.modo === "delivery" && !form.direccion.trim()) return setError("Falta la dirección del delivery.");
    if (!form.pago) return setError("Elige cómo paga.");

    // Mismo formato que los pedidos de la app (ver ClientView).
    const { fondos, entradas, adicionales } = armarLineas(form, ctx);

    setGuardando(true);
    try {
      await onGuardar({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        fondos,
        entradas,
        adicionales,
        modo: form.modo,
        direccion: form.modo === "delivery" ? form.direccion.trim() : "",
        pago: form.pago,
        notas: form.notas.trim(),
        origen: fuente === "manual" ? "manual" : "whatsapp",
        mensajeOriginal: fuente === "manual" ? "" : texto.slice(0, 4000),
        totalEstimado: total,
      });
      onClose();
    } catch (e) {
      setError(e.message || "No se pudo guardar el pedido.");
    } finally {
      setGuardando(false);
    }
  };

  const sinMenu = !dia || (!ctx.segundos.length && !ctx.entradas.length && !ctx.extras.length);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={paso === "mensaje" ? "Nuevo pedido de WhatsApp" : "Revisa el pedido"}
      footer={
        paso === "mensaje" ? (
          <div className="flex gap-2">
            <button
              onClick={llenarAMano}
              disabled={sinMenu}
              className="flex-1 border-2 border-arena-oscura text-texto-secundario rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <PenLine size={16} /> Llenar a mano
            </button>
            <button
              onClick={() => leer()}
              disabled={!texto.trim() || leyendo || sinMenu}
              className="btn-cta flex-[1.4] bg-terracota hover:bg-terracota-oscura disabled:opacity-50 text-white rounded-xl py-3 text-[14.5px] font-semibold flex items-center justify-center gap-2"
            >
              {leyendo ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
              {leyendo ? "Leyendo…" : "Leer pedido"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-mono text-[11px] text-texto-terciario uppercase">Total</div>
              <div className="font-mono text-terracota text-lg font-semibold">{soles(total)}</div>
            </div>
            <button onClick={() => setPaso("mensaje")} className="text-[13.5px] text-texto-secundario px-2 py-3">
              Volver
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white rounded-xl px-5 py-3 text-[14.5px] font-semibold flex items-center gap-2"
            >
              {guardando && <Loader2 size={16} className="animate-spin" />}
              Guardar pedido
            </button>
          </div>
        )
      }
    >
      {sinMenu && (
        <div className="bg-terracota/10 text-terracota text-[13.5px] rounded-xl px-3.5 py-3 mb-4">
          Primero publica el menú de hoy en la pestaña Menú.
        </div>
      )}

      {paso === "mensaje" && (
        <div className="space-y-3">
          <p className="text-[13.5px] text-texto-secundario leading-relaxed">
            En WhatsApp mantén presionado el mensaje del cliente (o varios), toca <b>Compartir</b> y elige <b>Cocina de Mamá</b>. También puedes
            copiarlo y pegarlo aquí.
          </p>
          <div className="relative">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={7}
              placeholder={'Ej: "Hola seño, me separa 2 ajís de gallina con sopita, paso a la 1. Apúntamelo"'}
              className={`${inputStyle} resize-none leading-relaxed`}
            />
            {!texto && (
              <button
                type="button"
                onClick={pegar}
                className="absolute right-2.5 bottom-2.5 bg-white border border-arena-oscura rounded-lg px-3 py-1.5 text-[13px] text-texto-secundario flex items-center gap-1.5"
              >
                <ClipboardPaste size={14} /> Pegar
              </button>
            )}
          </div>
        </div>
      )}

      {paso === "revisar" && (
        <div className="space-y-5">
          {fuente !== "manual" && (
            <div className="bg-white border border-[#eee2cb] rounded-xl p-3">
              <div className="text-[11px] uppercase tracking-wide text-texto-terciario mb-1 flex items-center gap-1">
                <MessageCircle size={12} /> Mensaje
                <span className="ml-auto normal-case tracking-normal">{fuente === "ia" ? "Leído con IA" : "Leído en el celular"}</span>
              </div>
              <p className="text-[13px] text-texto-secundario whitespace-pre-wrap line-clamp-4">{texto}</p>
            </div>
          )}

          {dudas.length > 0 && (
            <div className="bg-[#FFF4D6] border border-[#F0D28A] rounded-xl p-3 text-[13.5px] text-[#7A5A12]">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle size={15} /> Revisa esto
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {dudas.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Cliente">
              <input
                className={inputStyle}
                list="clientes-conocidos"
                value={form.nombre}
                onChange={(e) => {
                  const v = e.target.value;
                  const c = clientes.find((x) => x.nombre.toLowerCase() === v.trim().toLowerCase());
                  setForm((f) => ({
                    ...f,
                    nombre: v,
                    telefono: c && !f.telefono ? c.telefono : f.telefono,
                    direccion: c && !f.direccion ? c.direccion : f.direccion,
                  }));
                }}
                placeholder="Nombre"
              />
              <datalist id="clientes-conocidos">
                {clientes.map((c) => (
                  <option key={c.nombre} value={c.nombre} />
                ))}
              </datalist>
            </Field>
            <Field label="Teléfono">
              <input className={inputStyle} value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="Opcional" inputMode="tel" />
            </Field>
          </div>

          <div>
            <div className="text-sm mb-1.5 text-[#6b5f52] font-medium">Menús</div>
            <div className="space-y-2">
              {form.menus.map((m) => {
                const s = segPorId.get(m.segundoId);
                return (
                  <div key={m.key} className="bg-white border border-[#eee2cb] rounded-xl p-2.5 space-y-2">
                    <div className="flex gap-2 items-center">
                      <select
                        className={`${inputStyle} py-2`}
                        value={m.segundoId}
                        onChange={(e) => {
                          const nuevo = segPorId.get(e.target.value);
                          cambiarFila("menus", m.key, { segundoId: e.target.value, proteina: "", arroz: nuevo?.permiteArroz ? "con" : null });
                        }}
                      >
                        {!s && <option value="">Elige el segundo…</option>}
                        {ctx.segundos.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre}
                          </option>
                        ))}
                      </select>
                      <Cantidad valor={m.cantidad} onCambiar={(v) => cambiarFila("menus", m.key, { cantidad: v })} />
                      <button onClick={() => quitarFila("menus", m.key)} className="p-1.5 text-arena-hover hover:text-terracota" aria-label="Quitar menú">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {s?.requiereProteina && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.proteinas.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => cambiarFila("menus", m.key, { proteina: p })}
                            className={`px-3 py-1.5 rounded-full text-[13px] border-2 ${
                              m.proteina === p ? "bg-terracota border-terracota text-white font-semibold" : `bg-white text-texto-inactivo ${m.proteina ? "border-arena" : "border-[#F0D28A]"}`
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        className={`${inputStyle} py-2 text-[14px]`}
                        value={m.entradaId || ""}
                        onChange={(e) => cambiarFila("menus", m.key, { entradaId: e.target.value || null })}
                      >
                        <option value="">Sin entrada</option>
                        {ctx.entradas.map((x) => (
                          <option key={x.id} value={x.id}>
                            + {x.nombre}
                          </option>
                        ))}
                      </select>
                      {s?.permiteArroz && (
                        <button
                          type="button"
                          onClick={() => cambiarFila("menus", m.key, { arroz: m.arroz === "sin" ? "con" : "sin" })}
                          className={`shrink-0 px-3 rounded-lg border text-[13px] ${m.arroz === "sin" ? "border-ocre text-ocre bg-ocre/10" : "border-arena text-texto-secundario"}`}
                        >
                          {m.arroz === "sin" ? "Sin arroz" : "Con arroz"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {ctx.segundos.length > 0 && (
                <button onClick={() => set("menus", [...form.menus, nuevoMenu()])} className="text-[13.5px] text-terracota font-medium flex items-center gap-1">
                  <Plus size={15} /> Agregar menú
                </button>
              )}
            </div>
          </div>

          {(ctx.entradas.length > 0 || ctx.extras.length > 0) && (
            <div className="space-y-2">
              <div className="text-sm text-[#6b5f52] font-medium">Aparte</div>
              {form.entradasExtra.map((e) => (
                <div key={e.key} className="flex gap-2 items-center">
                  <select className={`${inputStyle} py-2 text-[14px]`} value={e.id} onChange={(ev) => cambiarFila("entradasExtra", e.key, { id: ev.target.value })}>
                    {ctx.entradas.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre} (entrada extra)
                      </option>
                    ))}
                  </select>
                  <Cantidad valor={e.cantidad} onCambiar={(v) => cambiarFila("entradasExtra", e.key, { cantidad: v })} />
                  <button onClick={() => quitarFila("entradasExtra", e.key)} className="p-1.5 text-arena-hover hover:text-terracota" aria-label="Quitar">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.adicionales.map((e) => (
                <div key={e.key} className="flex gap-2 items-center">
                  <select className={`${inputStyle} py-2 text-[14px]`} value={e.id} onChange={(ev) => cambiarFila("adicionales", e.key, { id: ev.target.value })}>
                    {ctx.extras.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nombre} ({soles(x.precio)})
                      </option>
                    ))}
                  </select>
                  <Cantidad valor={e.cantidad} onCambiar={(v) => cambiarFila("adicionales", e.key, { cantidad: v })} />
                  <button onClick={() => quitarFila("adicionales", e.key)} className="p-1.5 text-arena-hover hover:text-terracota" aria-label="Quitar">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="flex gap-4">
                {ctx.entradas.length > 0 && (
                  <button
                    onClick={() => set("entradasExtra", [...form.entradasExtra, { key: k(), id: ctx.entradas[0].id, cantidad: 1 }])}
                    className="text-[13.5px] text-terracota font-medium flex items-center gap-1"
                  >
                    <Plus size={15} /> Entrada extra
                  </button>
                )}
                {ctx.extras.length > 0 && (
                  <button
                    onClick={() => set("adicionales", [...form.adicionales, { key: k(), id: ctx.extras[0].id, cantidad: 1 }])}
                    className="text-[13.5px] text-terracota font-medium flex items-center gap-1"
                  >
                    <Plus size={15} /> Bebida o adicional
                  </button>
                )}
              </div>
            </div>
          )}

          <Field label="Recojo o delivery">
            <div className="grid grid-cols-2 gap-2">
              <SelectCard active={form.modo === "recojo"} onClick={() => set("modo", "recojo")} text="Recojo" compact icon={<Store size={15} />} />
              <SelectCard active={form.modo === "delivery"} onClick={() => set("modo", "delivery")} text="Delivery" compact icon={<MapPin size={15} />} />
            </div>
          </Field>
          {form.modo === "delivery" && (
            <Field label="Dirección">
              <input className={inputStyle} value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Jr. Las Flores 123" />
            </Field>
          )}

          <Field label="¿Cómo paga?">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAY_LABELS).map(([key, label]) => (
                <SelectCard key={key} active={form.pago === key} onClick={() => set("pago", key)} text={label} compact />
              ))}
            </div>
          </Field>

          <Field label="Notas">
            <input className={inputStyle} value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Sin cebolla, poca sal…" />
          </Field>

          {error && <div className="text-terracota text-[13.5px] bg-terracota/10 rounded-lg px-3 py-2.5">{error}</div>}
        </div>
      )}
    </Sheet>
  );
}
