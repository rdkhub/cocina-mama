// src/components/admin/CuadernoSheet.jsx
// Foto de la hoja del cuaderno → la IA lee todos los renglones → el papá
// revisa cada pedido (nombre, platos, entradas) y guarda los que estén bien.
import React, { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Plus, Minus, Trash2, AlertTriangle, Check, Store, MapPin } from "lucide-react";
import { Sheet, inputStyle, SelectCard } from "../ui";
import { contextoDelMenu } from "../../lib/leerPedido";
import { leerCuaderno, armarPedido } from "../../lib/leerCuaderno";
import { PAY_LABELS, soles } from "../../utils/pedidos";

let contador = 0;
const k = () => `c${Date.now()}_${contador++}`;
const norm = (t) =>
  (t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function Cantidad({ valor, onCambiar }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={() => onCambiar(Math.max(1, valor - 1))} className="w-7 h-7 rounded-full border border-arena-oscura text-texto-secundario flex items-center justify-center" aria-label="Uno menos">
        <Minus size={13} />
      </button>
      <span className="w-4 text-center font-semibold text-terracota text-[14px]">{valor}</span>
      <button type="button" onClick={() => onCambiar(Math.min(30, valor + 1))} className="w-7 h-7 rounded-full bg-terracota text-white flex items-center justify-center" aria-label="Uno más">
        <Plus size={13} />
      </button>
    </div>
  );
}

export function CuadernoSheet({ open, onClose, menuHoy, platos, todaysOrders, onGuardarVarios }) {
  const [paso, setPaso] = useState("foto"); // foto | revisar
  const [foto, setFoto] = useState(null); // URL para mostrar
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [dudasGenerales, setDudasGenerales] = useState([]);
  const [modo, setModo] = useState("delivery");
  const [pago, setPago] = useState("fiado");
  const camaraRef = useRef(null);
  const galeriaRef = useRef(null);

  const ctx = useMemo(() => contextoDelMenu(menuHoy, platos), [menuHoy, platos]);
  const segPorId = useMemo(() => new Map(ctx.segundos.map((s) => [s.id, s])), [ctx]);
  const dia = menuHoy.dia;
  const precioMenu = modo === "delivery" ? dia?.precioDelivery ?? 0 : dia?.precioRecojo ?? 0;
  const yaHoy = useMemo(() => new Set(todaysOrders.map((o) => norm(o.nombre))), [todaysOrders]);

  const reiniciar = () => {
    setPaso("foto");
    setFoto(null);
    setPedidos([]);
    setDudasGenerales([]);
    setError("");
  };

  const cerrar = () => {
    reiniciar();
    onClose();
  };

  const elegirFoto = async (file) => {
    if (!file) return;
    setError("");
    setFoto(URL.createObjectURL(file));
    setLeyendo(true);
    try {
      const r = await leerCuaderno(file, ctx);
      setPedidos(
        r.pedidos.map((p) => {
          const duplicado = [...yaHoy].some((n) => n && (n === norm(p.nombre) || n.split(" ").includes(norm(p.nombre))));
          return {
            ...p,
            key: k(),
            menus: p.menus.map((m) => ({ ...m, key: k() })),
            duplicado,
            incluir: !p.tachado && !duplicado && p.menus.length > 0,
          };
        })
      );
      setDudasGenerales(r.dudasGenerales);
      setPaso("revisar");
    } catch (e) {
      setError(e.message || "No se pudo leer la foto.");
    } finally {
      setLeyendo(false);
      if (camaraRef.current) camaraRef.current.value = "";
      if (galeriaRef.current) galeriaRef.current.value = "";
    }
  };

  const cambiarPedido = (key, cambios) => setPedidos((ps) => ps.map((p) => (p.key === key ? { ...p, ...cambios } : p)));
  const cambiarLinea = (pk, lk, cambios) =>
    setPedidos((ps) => ps.map((p) => (p.key === pk ? { ...p, menus: p.menus.map((m) => (m.key === lk ? { ...m, ...cambios } : m)) } : p)));
  const quitarLinea = (pk, lk) => setPedidos((ps) => ps.map((p) => (p.key === pk ? { ...p, menus: p.menus.filter((m) => m.key !== lk) } : p)));
  const agregarLinea = (pk) => {
    const s = ctx.segundos[0];
    if (!s) return;
    setPedidos((ps) =>
      ps.map((p) => (p.key === pk ? { ...p, menus: [...p.menus, { key: k(), segundoId: s.id, proteina: "", entradaId: null, arroz: s.permiteArroz ? "con" : null, cantidad: 1 }] } : p))
    );
  };
  const agregarPedido = () =>
    setPedidos((ps) => [...ps, { key: k(), nombre: "", menus: [], entradasExtra: [], adicionales: [], notas: "", dudas: [], listo: false, tachado: false, duplicado: false, incluir: true }]);

  const totalDe = (p) =>
    p.menus.reduce((a, m) => a + m.cantidad, 0) * precioMenu +
    (p.entradasExtra || []).reduce((a, e) => a + e.cantidad, 0) * (dia?.precioEntradaExtra ?? 0) +
    (p.adicionales || []).reduce((a, x) => a + x.cantidad * (ctx.extras.find((e) => e.id === x.id)?.precio || 0), 0);

  const seleccionados = pedidos.filter((p) => p.incluir);
  const totalGeneral = seleccionados.reduce((a, p) => a + totalDe(p), 0);

  const guardar = async () => {
    setError("");
    for (const p of seleccionados) {
      if (!p.nombre.trim()) return setError("Hay un pedido sin nombre.");
      if (!p.menus.length && !(p.entradasExtra || []).length && !(p.adicionales || []).length) return setError(`El pedido de ${p.nombre} está vacío.`);
      const s = p.menus.find((m) => segPorId.get(m.segundoId)?.requiereProteina && !m.proteina);
      if (s) return setError(`Falta la proteína en el pedido de ${p.nombre}.`);
    }
    setGuardando(true);
    try {
      const datos = seleccionados.map((p) => ({
        nombre: p.nombre.trim(),
        telefono: "",
        ...armarPedido(p, ctx),
        modo,
        direccion: "",
        pago,
        notas: (p.notas || "").trim(),
        origen: "manual",
        mensajeOriginal: "Foto del cuaderno",
        listo: p.listo,
      }));
      const fallidos = await onGuardarVarios(datos);
      if (fallidos.length) {
        const nombres = new Set(fallidos.map((f) => f.nombre));
        setPedidos((ps) => ps.filter((p) => !p.incluir || nombres.has(p.nombre.trim())));
        setError(`No se guardaron: ${fallidos.map((f) => `${f.nombre} (${f.error})`).join(", ")}. Los demás sí.`);
      } else {
        cerrar();
      }
    } finally {
      setGuardando(false);
    }
  };

  const sinMenu = !dia || !ctx.segundos.length;

  return (
    <Sheet
      open={open}
      onClose={cerrar}
      title={paso === "foto" ? "Foto del cuaderno" : `Revisa los pedidos (${seleccionados.length})`}
      footer={
        paso === "revisar" ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-mono text-[11px] text-texto-terciario uppercase">{seleccionados.length} pedidos</div>
              <div className="font-mono text-terracota text-lg font-semibold">{soles(totalGeneral)}</div>
            </div>
            <button onClick={reiniciar} className="text-[13.5px] text-texto-secundario px-2 py-3">
              Otra foto
            </button>
            <button
              onClick={guardar}
              disabled={guardando || !seleccionados.length}
              className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white rounded-xl px-5 py-3 text-[14.5px] font-semibold flex items-center gap-2"
            >
              {guardando && <Loader2 size={16} className="animate-spin" />}
              Guardar {seleccionados.length}
            </button>
          </div>
        ) : null
      }
    >
      {sinMenu && <div className="bg-terracota/10 text-terracota text-[13.5px] rounded-xl px-3.5 py-3 mb-4">Primero publica el menú de hoy en la pestaña Menú.</div>}

      {paso === "foto" && (
        <div className="space-y-4">
          <p className="text-[13.5px] text-texto-secundario leading-relaxed">
            Tómale foto a la hoja de pedidos de hoy. La app lee cada renglón y te muestra los pedidos para que los revises antes de guardarlos.
          </p>
          <ul className="text-[13px] text-texto-secundario list-disc pl-5 space-y-0.5">
            <li>Con buena luz y sin sombra.</li>
            <li>La hoja completa y derecha.</li>
            <li>Nombres claros; si uno está tachado, que se lea el correcto.</li>
          </ul>

          {foto && <img src={foto} alt="Foto del cuaderno" className="w-full max-h-64 object-contain rounded-xl bg-arena/40" />}

          {leyendo ? (
            <div className="flex items-center justify-center gap-2 py-4 text-texto-secundario text-[14px]">
              <Loader2 size={18} className="animate-spin" /> Leyendo la hoja… (unos segundos)
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => camaraRef.current?.click()}
                disabled={sinMenu}
                className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-50 text-white rounded-xl py-3.5 text-[14.5px] font-semibold flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Tomar foto
              </button>
              <button
                onClick={() => galeriaRef.current?.click()}
                disabled={sinMenu}
                className="border-2 border-arena-oscura text-texto-secundario disabled:opacity-50 rounded-xl py-3.5 text-[14px] font-medium flex items-center justify-center gap-2"
              >
                <ImagePlus size={18} /> De la galería
              </button>
            </div>
          )}
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => elegirFoto(e.target.files?.[0])} />
          <input ref={galeriaRef} type="file" accept="image/*" className="hidden" onChange={(e) => elegirFoto(e.target.files?.[0])} />
          {error && <div className="text-terracota text-[13.5px] bg-terracota/10 rounded-lg px-3 py-2.5">{error}</div>}
        </div>
      )}

      {paso === "revisar" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <SelectCard active={modo === "recojo"} onClick={() => setModo("recojo")} text="Todos recojo" compact icon={<Store size={14} />} />
            <SelectCard active={modo === "delivery"} onClick={() => setModo("delivery")} text="Todos delivery" compact icon={<MapPin size={14} />} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PAY_LABELS).map(([key, label]) => (
              <SelectCard key={key} active={pago === key} onClick={() => setPago(key)} text={label} compact />
            ))}
          </div>

          {dudasGenerales.length > 0 && (
            <div className="bg-[#FFF4D6] border border-[#F0D28A] rounded-xl p-3 text-[13px] text-[#7A5A12]">
              {dudasGenerales.map((d, i) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          )}

          {pedidos.map((p) => (
            <div key={p.key} className={`bg-white rounded-2xl border-2 p-3 space-y-2 transition ${p.incluir ? "border-[#eee2cb]" : "border-transparent opacity-55"}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cambiarPedido(p.key, { incluir: !p.incluir })}
                  aria-pressed={p.incluir}
                  aria-label={p.incluir ? "No guardar este pedido" : "Guardar este pedido"}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${p.incluir ? "bg-salvia border-salvia text-white" : "border-arena-oscura text-transparent"}`}
                >
                  <Check size={15} strokeWidth={3} />
                </button>
                <input className={`${inputStyle} py-2 font-medium`} value={p.nombre} onChange={(e) => cambiarPedido(p.key, { nombre: e.target.value })} placeholder="Nombre" />
                <span className="font-mono text-[13px] text-terracota shrink-0">{soles(totalDe(p))}</span>
              </div>

              {(p.tachado || p.duplicado || p.dudas.length > 0) && (
                <div className="bg-[#FFF4D6] rounded-lg px-2.5 py-2 text-[12.5px] text-[#7A5A12] space-y-0.5">
                  {p.tachado && (
                    <div className="flex gap-1">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Este renglón está tachado (cancelado).
                    </div>
                  )}
                  {p.duplicado && (
                    <div className="flex gap-1">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> Ya hay un pedido de este nombre hoy en la app. ¿Es el mismo?
                    </div>
                  )}
                  {p.dudas.map((d, i) => (
                    <div key={i} className="flex gap-1">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {d}
                    </div>
                  ))}
                </div>
              )}

              {p.menus.map((m) => {
                const s = segPorId.get(m.segundoId);
                return (
                  <div key={m.key} className="space-y-1.5">
                    <div className="border-t border-divisor pt-2 space-y-1.5">
                      <select
                        className={`${inputStyle} py-2 px-2.5 text-[14px] font-medium`}
                        value={m.segundoId}
                        onChange={(e) => {
                          const n = segPorId.get(e.target.value);
                          cambiarLinea(p.key, m.key, { segundoId: e.target.value, proteina: "", arroz: n?.permiteArroz ? "con" : null });
                        }}
                      >
                        {ctx.segundos.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre}
                          </option>
                        ))}
                      </select>
                    <div className="flex gap-1.5 items-center">
                      <select
                        className={`${inputStyle} py-1.5 px-2 text-[13.5px]`}
                        value={m.entradaId || ""}
                        onChange={(e) => cambiarLinea(p.key, m.key, { entradaId: e.target.value || null })}
                      >
                        <option value="">Sin entrada</option>
                        {ctx.entradas.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre}
                          </option>
                        ))}
                      </select>
                      <Cantidad valor={m.cantidad} onCambiar={(v) => cambiarLinea(p.key, m.key, { cantidad: v })} />
                      <button onClick={() => quitarLinea(p.key, m.key)} className="p-1 text-arena-hover hover:text-terracota" aria-label="Quitar plato">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    </div>
                    {(s?.requiereProteina || s?.permiteArroz) && (
                      <div className="flex flex-wrap gap-1.5 pl-0.5">
                        {s.requiereProteina &&
                          s.proteinas.map((pr) => (
                            <button
                              key={pr}
                              type="button"
                              onClick={() => cambiarLinea(p.key, m.key, { proteina: pr })}
                              className={`px-2.5 py-1 rounded-full text-[12.5px] border ${m.proteina === pr ? "bg-terracota border-terracota text-white" : "border-arena text-texto-inactivo"}`}
                            >
                              {pr}
                            </button>
                          ))}
                        {s.permiteArroz && (
                          <button
                            type="button"
                            onClick={() => cambiarLinea(p.key, m.key, { arroz: m.arroz === "sin" ? "con" : "sin" })}
                            className={`px-2.5 py-1 rounded-full text-[12.5px] border ${m.arroz === "sin" ? "border-ocre text-ocre bg-ocre/10" : "border-arena text-texto-secundario"}`}
                          >
                            {m.arroz === "sin" ? "Sin arroz" : "Con arroz"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center justify-between">
                <button onClick={() => agregarLinea(p.key)} className="text-[13px] text-terracota font-medium flex items-center gap-1">
                  <Plus size={14} /> Plato
                </button>
                <button
                  type="button"
                  onClick={() => cambiarPedido(p.key, { listo: !p.listo })}
                  className={`text-[12.5px] px-2.5 py-1 rounded-full border ${p.listo ? "border-salvia text-salvia bg-salvia/10" : "border-arena text-texto-terciario"}`}
                >
                  {p.listo ? "✓ Listo" : "Pendiente"}
                </button>
              </div>
            </div>
          ))}

          <button onClick={agregarPedido} className="w-full border-2 border-dashed border-arena-oscura rounded-xl py-2.5 text-[13.5px] text-texto-secundario flex items-center justify-center gap-1.5">
            <Plus size={15} /> Agregar un pedido que no salió
          </button>

          {error && <div className="text-terracota text-[13.5px] bg-terracota/10 rounded-lg px-3 py-2.5">{error}</div>}
        </div>
      )}
    </Sheet>
  );
}
