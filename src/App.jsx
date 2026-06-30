import React, { useState, useEffect, useCallback } from "react";
import { ChefHat, Clock, CheckCircle2, Circle, Phone, MapPin, Store, Plus, Minus, Trash2, Lock, ArrowLeft, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { todayKey, todayLabel, defaultMenu, loadMenu, saveMenu, loadOrders, createOrder, updateOrder, deleteOrder } from "./data";
import { supabase } from "./supabaseClient";


const PAY_LABELS = {
  yape: "Yape",
  efectivo: "Efectivo",
  fiado: "Fiado / Debe",
};

const PAY_COLORS = {
  yape: "#5C7A4F",
  efectivo: "#9C7A3C",
  fiado: "#C1452D",
};

// ---------- Precios ----------
// El precio del fondo (solo, o acompañado de entrada formando un menú completo)
// sube S/1 cuando es delivery. La entrada adicional/sola siempre cuesta lo mismo.
const PRECIO_FONDO_RECOJO = 12; // 1 fondo (con o sin entrada) — recojo en local
const PRECIO_FONDO_DELIVERY = 13; // 1 fondo (con o sin entrada) — delivery
const PRECIO_ENTRADA_SOLA = 3; // entrada sin fondo que la acompañe (no varía por modo)

// Suma cantidades de un arreglo [{ nombre, cantidad }, ...]
function sumarCantidades(items) {
  return (items || []).reduce((acc, it) => acc + (it.cantidad || 0), 0);
}

// Calcula el total a pagar: cada fondo (solo, o emparejado con una entrada)
// cuesta S/12 en recojo o S/13 en delivery. Las entradas que NO vinieron asociadas
// a un fondo (es decir, las que el cliente pidió de más, sueltas) cuestan S/3 cada
// una, sin importar el modo de entrega. Los adicionales se cobran aparte, cada uno
// según su propio precio.
function calcularTotal(fondos, entradas, modo = "recojo", adicionales = []) {
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

// ---------- Small UI atoms ----------
function Tag({ children, color }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.7rem",
        letterSpacing: "0.04em",
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        border: `1px solid ${color}`,
        color: color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5 text-[#6b5f52] font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputStyle =
  "w-full rounded-lg border border-[#dccdb4] bg-[#FFFDF8] px-3.5 py-2.5 text-[15px] text-[#2B2622] placeholder-[#a89a86] outline-none focus:border-[#C1452D] focus:ring-2 focus:ring-[#C1452D]/15 transition";

// =====================================================================
// CLIENT VIEW
// =====================================================================
function ClientView({ menu, onSubmit, submitting, justSubmitted, onReset }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  // fondoSeleccion[i] = array con un objeto por cada unidad pedida del fondo i.
  // Cada objeto es { proteina, entrada } para ESA unidad ("" si no aplica).
  // Ej: fondoSeleccion[0] = [{proteina:"Milanesa", entrada:"Ensalada de palta"}, {proteina:"Plancha", entrada:""}]
  // significa 2 unidades del fondo 0: una con Milanesa + ensalada de palta, otra con Plancha sin entrada.
  const [fondoSeleccion, setFondoSeleccion] = useState(menu.fondos.map(() => []));
  // arrozElegido[i] = "con" | "sin" | null (null si ese plato no tiene la opción)
  const [arrozElegido, setArrozElegido] = useState(menu.fondos.map((f) => (f.permiteArroz ? "con" : null)));
  // entradaExtraQty[j] = cantidad de entradas SUELTAS (sin asociar a ningún fondo) que el
  // cliente pide de más — estas siempre cuestan S/3 cada una.
  const [entradaExtraQty, setEntradaExtraQty] = useState(menu.entradas.map(() => 0));
  const [adicionalQty, setAdicionalQty] = useState((menu.adicionales || []).map(() => 0));
  const [modo, setModo] = useState("recojo"); // recojo | delivery
  const [direccion, setDireccion] = useState("");
  const [pago, setPago] = useState("fiado"); // yape | efectivo | fiado
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const fondoQty = fondoSeleccion.map((arr) => arr.length);
  const totalFondos = fondoQty.reduce((a, b) => a + b, 0);
  const totalEntradasExtra = entradaExtraQty.reduce((a, b) => a + b, 0);
  const precioFondoUnidad = modo === "delivery" ? PRECIO_FONDO_DELIVERY : PRECIO_FONDO_RECOJO;
  // Cuenta cuántas unidades de fondo ya eligieron una entrada incluida (para el desglose visual)
  const entradasIncluidasElegidas = fondoSeleccion.reduce(
    (acc, arr) => acc + arr.filter((u) => u.entrada).length,
    0
  );
  const totalPagar =
    totalFondos * precioFondoUnidad +
    totalEntradasExtra * PRECIO_ENTRADA_SOLA +
    (menu.adicionales || []).reduce((acc, a, i) => acc + adicionalQty[i] * a.precio, 0);

  const bump = (arr, setArr, i, delta) => {
    const copy = [...arr];
    copy[i] = Math.max(0, copy[i] + delta);
    setArr(copy);
  };

  // Lista de opciones de proteína para el fondo i: las suyas propias.
  const opcionesProteina = (i) => {
    const texto = menu.fondos[i]?.proteinas || "";
    return texto
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  };

  // Agrega una unidad del fondo i con la proteína indicada ("" si no aplica). La entrada
  // de esa unidad arranca vacía (el cliente la elige después con elegirEntradaDeUnidad).
  const agregarFondo = (i, proteina) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    copy[i].push({ proteina, entrada: "" });
    setFondoSeleccion(copy);
  };

  // Quita la última unidad agregada del fondo i (o una con proteína específica si se indica)
  const quitarFondo = (i, proteinaEspecifica = null) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    if (proteinaEspecifica !== null) {
      const idx = copy[i].map((u) => u.proteina).lastIndexOf(proteinaEspecifica);
      if (idx !== -1) copy[i].splice(idx, 1);
    } else {
      copy[i].pop();
    }
    setFondoSeleccion(copy);
  };

  // Cuenta cuántas unidades del fondo i tienen una proteína específica
  const contarProteina = (i, proteina) => fondoSeleccion[i].filter((u) => u.proteina === proteina).length;

  // Cambia la entrada elegida de la unidad #unidadIdx del fondo i
  const elegirEntradaDeUnidad = (i, unidadIdx, entrada) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    copy[i][unidadIdx] = { ...copy[i][unidadIdx], entrada: copy[i][unidadIdx].entrada === entrada ? "" : entrada };
    setFondoSeleccion(copy);
  };

  const handleSubmit = () => {
    if (!nombre.trim()) return setError("Falta tu nombre.");
    if (!telefono.trim()) return setError("Falta tu número de teléfono.");
    const totalAdicionales = adicionalQty.reduce((a, b) => a + b, 0);
    if (totalFondos === 0 && totalEntradasExtra === 0 && totalAdicionales === 0) {
      return setError("Elige al menos un plato, entrada, bebida o adicional.");
    }
    if (modo === "delivery" && !direccion.trim()) return setError("Falta la dirección de entrega.");
    setError("");

    // Agrupa las unidades de cada fondo por combinación de proteína + entrada elegida,
    // para no repetir una línea por cada unidad individual.
    const fondos = [];
    const entradasIncluidasConteo = {}; // nombre de entrada -> cuántas veces fue elegida junto a un fondo
    menu.fondos.forEach((plato, i) => {
      const seleccion = fondoSeleccion[i];
      if (seleccion.length === 0) return;
      const porCombo = {};
      seleccion.forEach((u) => {
        const key = `${u.proteina || "__sin__"}|||${u.entrada || "__sin__"}`;
        porCombo[key] = (porCombo[key] || 0) + 1;
        if (u.entrada) entradasIncluidasConteo[u.entrada] = (entradasIncluidasConteo[u.entrada] || 0) + 1;
      });
      Object.entries(porCombo).forEach(([key, cantidad]) => {
        const [proteinaKey, entradaKey] = key.split("|||");
        fondos.push({
          nombre: plato.nombre,
          cantidad,
          ...(proteinaKey !== "__sin__" ? { proteina: proteinaKey } : {}),
          ...(entradaKey !== "__sin__" ? { entradaIncluida: entradaKey } : {}),
          ...(plato.permiteArroz ? { arroz: arrozElegido[i] } : {}),
        });
      });
    });

    // El array "entradas" combina las que vinieron incluidas con un fondo (para que
    // queden registradas en el detalle del pedido) y las extra sueltas que el cliente
    // pidió de más. El precio solo cuenta las EXTRA (calcularTotal ya sabe distinguir
    // por cantidad de fondos vs cantidad de entradas total).
    const entradas = menu.entradas
      .map((nombrePlato, i) => {
        const incluidas = entradasIncluidasConteo[nombrePlato] || 0;
        const extra = entradaExtraQty[i] || 0;
        const cantidad = incluidas + extra;
        return cantidad > 0 ? { nombre: nombrePlato, cantidad } : null;
      })
      .filter(Boolean);

    const adicionales = (menu.adicionales || [])
      .map((a, i) => (adicionalQty[i] > 0 ? { nombre: a.nombre, cantidad: adicionalQty[i], precio: a.precio } : null))
      .filter(Boolean);

    onSubmit({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fondos,
      entradas,
      adicionales,
      modo,
      direccion: modo === "delivery" ? direccion.trim() : "",
      pago,
      notas: notas.trim(),
      total: calcularTotal(fondos, entradas, modo, adicionales),
    });
  };

  if (justSubmitted) {
    return (
      <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#5C7A4F]/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} color="#5C7A4F" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-2xl text-[#2B2622] mb-2">Pedido recibido</h2>
          <p className="text-[#6b5f52] text-[15px] leading-relaxed mb-7">
            Tu pedido ya está en la cocina. Te avisamos por WhatsApp cuando esté listo
            {justSubmitted.modo === "delivery" ? " para salir." : " para recoger."}
          </p>
          <div className="text-left bg-white rounded-2xl border border-[#e8ddc8] p-4 mb-7 text-sm">
            {justSubmitted.fondos.map((f, i) => {
              const detalles = [
                f.proteina,
                f.entradaIncluida ? `con ${f.entradaIncluida}` : null,
                f.arroz === "con" ? "con arroz" : f.arroz === "sin" ? "sin arroz" : null,
              ].filter(Boolean);
              return (
                <Row
                  key={"f" + i}
                  label={f.cantidad > 1 ? `Plato (x${f.cantidad})` : "Plato"}
                  value={detalles.length > 0 ? `${f.nombre} — ${detalles.join(", ")}` : f.nombre}
                />
              );
            })}
            {(() => {
              const incluidasPorNombre = {};
              justSubmitted.fondos.forEach((f) => {
                if (f.entradaIncluida) incluidasPorNombre[f.entradaIncluida] = (incluidasPorNombre[f.entradaIncluida] || 0) + f.cantidad;
              });
              return justSubmitted.entradas
                .map((e) => {
                  const extra = e.cantidad - (incluidasPorNombre[e.nombre] || 0);
                  return extra > 0 ? { ...e, cantidad: extra } : null;
                })
                .filter(Boolean)
                .map((e, i) => (
                  <Row key={"ex" + i} label={e.cantidad > 1 ? `Entrada adicional (x${e.cantidad})` : "Entrada adicional"} value={e.nombre} />
                ));
            })()}
            {(justSubmitted.adicionales || []).map((a, i) => (
              <Row key={"a" + i} label={a.cantidad > 1 ? `Adicional (x${a.cantidad})` : "Adicional"} value={a.nombre} />
            ))}
            <Row label="Refresco" value={`${menu.bebida} (incluido)`} />
            <Row label="Pago" value={PAY_LABELS[justSubmitted.pago]} />
            <Row label="Total a pagar" value={`S/ ${justSubmitted.total.toFixed(2)}`} />
          </div>

          {justSubmitted.pago === "yape" && (
            <div className="bg-[#5C7A4F]/10 border border-[#5C7A4F]/30 rounded-2xl p-4 mb-7 text-left flex items-start gap-2.5">
              <Wallet size={18} color="#5C7A4F" className="shrink-0 mt-0.5" />
              <p className="text-[#3a4a32] text-[14px] leading-relaxed">
                No olvides mandar tu captura del Yape por WhatsApp para confirmar tu pago.
              </p>
            </div>
          )}

          <button
            onClick={onReset}
            className="text-[#C1452D] text-sm font-medium underline-offset-4 hover:underline"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF6EC] pb-32">
      {/* Hero: la pizarra del menú */}
      <div className="relative bg-[#2B2622] text-[#FBF6EC] px-5 pt-9 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0%, transparent 1%), radial-gradient(circle at 80% 60%, #fff 0%, transparent 1%)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <ChefHat size={20} strokeWidth={1.75} color="#E0A95C" />
            <span className="font-display text-lg tracking-wide">Cocina de Mamá</span>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
            }}
            className="text-[#E0A95C] uppercase mb-1"
          >
            Menú de hoy &middot; {todayLabel()}
          </div>
          <h1 className="font-display text-[2rem] leading-[1.1] mb-1">{menu.fondos[0]?.nombre}</h1>
          {menu.fondos.length > 1 && (
            <p className="text-[#cfc3ad] text-[15px] mb-2">
              o {menu.fondos.slice(1).map((f) => f.nombre).join(" · o ")}
            </p>
          )}
          <p className="text-[#E0A95C] text-[14px]">+ Refresco: {menu.bebida}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 -mt-7 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(43,38,34,0.08)] border border-[#eee2cb] p-5 mb-7">
          <div className="flex gap-2 flex-wrap">
            <Tag color="#5C7A4F">Puedes pedir varios platos y cantidades</Tag>
          </div>
        </div>

        <h2 className="font-display text-xl text-[#2B2622] mb-3.5">Armar mi pedido</h2>

        <div className="space-y-5">
          <Field label="Platos de fondo (elige cantidad de cada uno)">
            <div className="space-y-2">
              {menu.fondos.map((f, i) => {
                const opciones = opcionesProteina(i);
                const selectorArroz = f.permiteArroz && fondoQty[i] > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <button
                      onClick={() => {
                        const copy = [...arrozElegido];
                        copy[i] = "con";
                        setArrozElegido(copy);
                      }}
                      className={`text-[13px] py-1.5 rounded-lg border-2 transition ${
                        arrozElegido[i] === "con"
                          ? "border-[#C1452D] bg-white font-semibold text-[#2B2622]"
                          : "border-[#e8ddc8] bg-white text-[#5c5246]"
                      }`}
                    >
                      Con arroz
                    </button>
                    <button
                      onClick={() => {
                        const copy = [...arrozElegido];
                        copy[i] = "sin";
                        setArrozElegido(copy);
                      }}
                      className={`text-[13px] py-1.5 rounded-lg border-2 transition ${
                        arrozElegido[i] === "sin"
                          ? "border-[#C1452D] bg-white font-semibold text-[#2B2622]"
                          : "border-[#e8ddc8] bg-white text-[#5c5246]"
                      }`}
                    >
                      Sin arroz
                    </button>
                  </div>
                );

                // Selector de entrada por cada unidad ya agregada de este plato.
                // Es opcional: si no elige ninguna, esa unidad simplemente no lleva entrada.
                // Esta entrada va INCLUIDA gratis con el fondo. Si el cliente quiere una
                // entrada de más (pagada aparte, S/3), lo hace en la sección de abajo
                // "Entrada extra", que queda justo después de esta para que no se confundan.
                const selectorEntradasPorUnidad = fondoQty[i] > 0 && menu.entradas.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {fondoSeleccion[i].map((unidad, unidadIdx) => (
                      <div key={unidadIdx} className="bg-[#FBF6EC] rounded-lg p-2.5">
                        <div className="text-[11px] text-[#8a7d6b] mb-1.5">
                          {f.nombre}
                          {unidad.proteina ? ` — ${unidad.proteina}` : ""} #{unidadIdx + 1} &middot; elige su entrada{" "}
                          <span className="text-[#5C7A4F] font-medium">(incluida, gratis)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {menu.entradas.map((e) => (
                            <button
                              key={e}
                              onClick={() => elegirEntradaDeUnidad(i, unidadIdx, e)}
                              className={`text-[12px] px-2.5 py-1.5 rounded-full border-2 transition ${
                                unidad.entrada === e
                                  ? "border-[#5C7A4F] bg-white font-semibold text-[#2B2622]"
                                  : "border-[#e8ddc8] bg-white text-[#5c5246]"
                              }`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );

                if (opciones.length === 0) {
                  // Plato sin opciones de proteína: un solo contador, como antes.
                  return (
                    <div key={i}>
                      <QtyCard
                        text={f.nombre}
                        qty={fondoQty[i]}
                        onChange={(d) => (d > 0 ? agregarFondo(i, "") : quitarFondo(i))}
                      />
                      {selectorArroz}
                      {selectorEntradasPorUnidad}
                    </div>
                  );
                }
                // Plato con opciones de proteína: un contador independiente por cada opción,
                // así se puede pedir, por ejemplo, 1 con Milanesa y 1 con Plancha del mismo plato.
                return (
                  <div key={i} className={`rounded-xl border-2 p-3 ${fondoQty[i] > 0 ? "border-[#C1452D] bg-white" : "border-[#e8ddc8] bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[14px] ${fondoQty[i] > 0 ? "font-semibold text-[#2B2622]" : "text-[#5c5246]"}`}>
                        {f.nombre}
                      </span>
                      {fondoQty[i] > 0 && (
                        <span className="text-[13px] text-[#C1452D] font-medium">x{fondoQty[i]}</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {opciones.map((op) => {
                        const cant = contarProteina(i, op);
                        return (
                          <div key={op} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2">
                            <span className={`text-[13px] ${cant > 0 ? "font-medium text-[#2B2622]" : "text-[#8a7d6b]"}`}>{op}</span>
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => quitarFondo(i, op)}
                                disabled={cant === 0}
                                className="w-6 h-6 rounded-full border border-[#dccdb4] text-[#8a7d6b] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
                              >
                                <Minus size={12} />
                              </button>
                              <span className={`w-4 text-center text-[14px] font-semibold ${cant > 0 ? "text-[#C1452D]" : "text-[#c7b89a]"}`}>
                                {cant}
                              </span>
                              <button
                                onClick={() => agregarFondo(i, op)}
                                className="w-6 h-6 rounded-full bg-[#C1452D] text-white flex items-center justify-center active:bg-[#a93a25]"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {selectorArroz}
                    {selectorEntradasPorUnidad}
                  </div>
                );
              })}
            </div>
          </Field>

          {menu.entradas.length > 0 && (
            <Field label="Entrada extra (S/ 3.00 cada una)">
              <p className="text-[12px] text-[#8a7d6b] -mt-1 mb-1">
                Esto es aparte de la entrada gratis que ya elegiste arriba con tu plato. Solo úsalo si quieres una de más.
              </p>
              <div className="space-y-2">
                {menu.entradas.map((e, i) => (
                  <QtyCard
                    key={i}
                    text={e}
                    priceTag="+ S/ 3.00"
                    qty={entradaExtraQty[i]}
                    onChange={(d) => bump(entradaExtraQty, setEntradaExtraQty, i, d)}
                  />
                ))}
              </div>
            </Field>
          )}

          {(menu.adicionales || []).length > 0 && (
            <Field label="Adicionales (opcional)">
              <div className="space-y-2">
                {menu.adicionales.map((a, i) => (
                  <QtyCard
                    key={i}
                    text={a.nombre}
                    priceTag={`+ S/ ${a.precio.toFixed(2)}`}
                    qty={adicionalQty[i]}
                    onChange={(d) => bump(adicionalQty, setAdicionalQty, i, d)}
                  />
                ))}
              </div>
            </Field>
          )}

          <Field label="Recojo o delivery">
            <div className="grid grid-cols-2 gap-2">
              <SelectCard active={modo === "recojo"} onClick={() => setModo("recojo")} text="Recojo en local" compact icon={<Store size={15} />} />
              <SelectCard active={modo === "delivery"} onClick={() => setModo("delivery")} text="Delivery" compact icon={<MapPin size={15} />} />
            </div>
          </Field>

          {modo === "delivery" && (
            <Field label="Dirección de entrega">
              <input className={inputStyle} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Jr. Las Flores 123, dpto 4" />
            </Field>
          )}

          <Field label="¿Cómo vas a pagar?">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAY_LABELS).map(([key, label]) => (
                <SelectCard key={key} active={pago === key} onClick={() => setPago(key)} text={label} compact />
              ))}
            </div>
          </Field>

          <Field label="Tu nombre">
            <input className={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </Field>

          <Field label="Tu WhatsApp">
            <input className={inputStyle} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="999 999 999" inputMode="tel" />
          </Field>

          <Field label="Notas (opcional)">
            <input className={inputStyle} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Sin cebolla, poca sal, etc." />
          </Field>

          {(totalFondos > 0 || entradaExtraQty.some((q) => q > 0) || adicionalQty.some((q) => q > 0)) && (
            <div className="bg-[#2B2622] rounded-2xl p-4 text-[#FBF6EC]">
              <div className="text-[#E0A95C] text-xs uppercase tracking-wide mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Tu pedido
              </div>
              <div className="space-y-1.5 text-[14px]">
                {/* Cada fondo cuesta lo mismo tenga o no entrada (S/12 recojo, S/13 delivery).
                    Si el cliente eligió una entrada para esa unidad, se muestra incluida. */}
                {menu.fondos.map((f, i) => {
                  if (fondoQty[i] === 0) return null;
                  const opciones = opcionesProteina(i);
                  const arrozTexto = f.permiteArroz ? (arrozElegido[i] === "con" ? " (con arroz)" : " (sin arroz)") : "";
                  // Agrupa las unidades de este fondo por la entrada que eligieron, para mostrar
                  // una línea por combinación (ej: "2 con Ensalada de tomate", "1 sin entrada")
                  const conteoPorEntrada = {};
                  fondoSeleccion[i].forEach((u) => {
                    if (opciones.length > 0) return; // ya se desglosa por proteína más abajo
                    const key = u.entrada || "__sin__";
                    conteoPorEntrada[key] = (conteoPorEntrada[key] || 0) + 1;
                  });

                  if (opciones.length === 0) {
                    return Object.entries(conteoPorEntrada).map(([key, cant]) => {
                      const subtotal = cant * precioFondoUnidad;
                      return (
                        <div key={"sf" + i + key} className="flex justify-between items-baseline">
                          <span>
                            {f.nombre}{arrozTexto}
                            {key !== "__sin__" && <span className="text-[#cfc3ad]"> + {key}</span>}
                            <span className="text-[#9c9082]"> &middot; {cant} x S/{precioFondoUnidad}</span>
                          </span>
                          <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
                        </div>
                      );
                    });
                  }
                  // Plato con proteínas: una línea por cada combinación proteína + entrada
                  const conteoCombo = {};
                  fondoSeleccion[i].forEach((u) => {
                    const key = `${u.proteina}|||${u.entrada || "__sin__"}`;
                    conteoCombo[key] = (conteoCombo[key] || 0) + 1;
                  });
                  return Object.entries(conteoCombo).map(([key, cant]) => {
                    const [proteina, entradaKey] = key.split("|||");
                    const subtotal = cant * precioFondoUnidad;
                    return (
                      <div key={"sf" + i + key} className="flex justify-between items-baseline">
                        <span>
                          {f.nombre}
                          <span className="text-[#cfc3ad]"> — {proteina}{arrozTexto}</span>
                          {entradaKey !== "__sin__" && <span className="text-[#cfc3ad]"> + {entradaKey}</span>}
                          <span className="text-[#9c9082]"> &middot; {cant} x S/{precioFondoUnidad}</span>
                        </span>
                        <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
                      </div>
                    );
                  });
                })}

                {/* Entradas adicionales: las que el cliente pidió de más, sin asociar a un fondo. */}
                {menu.entradas.map((e, i) => {
                  if (entradaExtraQty[i] === 0) return null;
                  const subtotal = entradaExtraQty[i] * 3;
                  return (
                    <div key={"sea" + i} className="flex justify-between items-baseline text-[#cfc3ad]">
                      <span>
                        {e} (extra)
                        <span className="text-[#9c9082]"> &middot; {entradaExtraQty[i]} x S/3</span>
                      </span>
                      <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
                    </div>
                  );
                })}

                {(menu.adicionales || []).map((a, i) => {
                  if (adicionalQty[i] === 0) return null;
                  const subtotal = adicionalQty[i] * a.precio;
                  return (
                    <div key={"sa" + i} className="flex justify-between items-baseline text-[#cfc3ad]">
                      <span>
                        {a.nombre}
                        <span className="text-[#9c9082]"> &middot; {adicionalQty[i]} x S/{a.precio}</span>
                      </span>
                      <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-baseline text-[#cfc3ad]">
                  <span>Refresco: {menu.bebida}</span>
                  <span className="text-[#E0A95C] font-medium ml-3 shrink-0">Incluido</span>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#463f33]">
                <span className="text-[15px] font-medium">Total a pagar</span>
                <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  S/ {totalPagar.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[#C1452D] text-sm bg-[#C1452D]/8 rounded-lg px-3 py-2.5">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#C1452D] hover:bg-[#a93a25] disabled:opacity-60 text-white font-medium rounded-xl py-3.5 text-[15px] transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Enviando pedido…" : "Enviar mi pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#f0e8d6] last:border-0">
      <span className="text-[#8a7d6b]">{label}</span>
      <span className="text-[#2B2622] font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// Tarjeta de cantidad: botones - y + para elegir cuántas unidades de un plato.
// Cuando qty > 0, queda resaltada en BLANCO con borde rojo (no gris) para que se note claro que está elegida.
// priceTag (opcional) muestra el precio justo al lado del nombre, al estilo de apps de delivery
// (item + precio + selector de cantidad), para que el costo quede clarísimo antes de tocar el "+".
function QtyCard({ text, qty, onChange, priceTag }) {
  const active = qty > 0;
  return (
    <div
      className={`w-full rounded-xl border-2 flex items-center justify-between gap-3 px-3.5 py-2.5 transition ${
        active ? "border-[#C1452D] bg-white shadow-[0_2px_8px_rgba(193,69,45,0.12)]" : "border-[#e8ddc8] bg-white"
      }`}
    >
      <div className="flex flex-col">
        <span className={`text-[14px] ${active ? "font-semibold text-[#2B2622]" : "text-[#5c5246]"}`}>{text}</span>
        {priceTag && <span className="text-[12px] text-[#9C7A3C] font-medium">{priceTag}</span>}
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onChange(-1)}
          disabled={qty === 0}
          className="w-7 h-7 rounded-full border border-[#dccdb4] text-[#8a7d6b] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
        >
          <Minus size={14} />
        </button>
        <span className={`w-5 text-center text-[15px] font-semibold ${active ? "text-[#C1452D]" : "text-[#c7b89a]"}`}>{qty}</span>
        <button
          onClick={() => onChange(1)}
          className="w-7 h-7 rounded-full bg-[#C1452D] text-white flex items-center justify-center active:bg-[#a93a25]"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function SelectCard({ active, onClick, text, compact, icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 transition flex items-center gap-2 ${
        compact ? "px-3 py-2.5 justify-center text-center" : "px-3.5 py-3"
      } ${
        active
          ? "border-[#C1452D] bg-white text-[#2B2622] font-semibold shadow-[0_2px_8px_rgba(193,69,45,0.12)]"
          : "border-[#e8ddc8] bg-white text-[#5c5246] hover:border-[#d8c8a6]"
      }`}
    >
      {icon}
      <span className={`text-[14px] ${active ? "font-medium" : ""}`}>{text}</span>
      {!compact && (
        <span className="ml-auto">
          {active ? <CheckCircle2 size={18} color="#C1452D" /> : <Circle size={18} color="#d8c8a6" />}
        </span>
      )}
    </button>
  );
}

// =====================================================================
// PIN LOCK
// =====================================================================
const ADMIN_PIN = "1234"; // cámbialo aquí por el PIN que quieras usar en el local

function PinScreen({ onUnlock, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const tryUnlock = (value) => {
    if (value === ADMIN_PIN) {
      onUnlock();
    } else if (value.length >= ADMIN_PIN.length) {
      setError(true);
      setTimeout(() => setError(false), 600);
      setPin("");
    }
  };

  const press = (d) => {
    const next = (pin + d).slice(0, ADMIN_PIN.length);
    setPin(next);
    if (next.length === ADMIN_PIN.length) tryUnlock(next);
  };

  return (
    <div className="min-h-screen bg-[#2B2622] flex items-center justify-center px-5">
      <div className="max-w-xs w-full text-center">
        <Lock size={28} color="#E0A95C" className="mx-auto mb-4" />
        <h2 className="font-display text-xl text-[#FBF6EC] mb-1">Panel de mamá</h2>
        <p className="text-[#9c9082] text-sm mb-7">Ingresa el PIN para entrar</p>

        <div className={`flex justify-center gap-3 mb-8 ${error ? "animate-pulse" : ""}`}>
          {Array.from({ length: ADMIN_PIN.length }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                borderColor: error ? "#C1452D" : "#E0A95C",
                backgroundColor: i < pin.length ? (error ? "#C1452D" : "#E0A95C") : "transparent",
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => press("0")}
            className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="aspect-square rounded-2xl text-[#9c9082] text-sm font-medium hover:bg-[#3a342c] transition"
          >
            Borrar
          </button>
        </div>

        <button onClick={onBack} className="text-[#9c9082] text-sm hover:text-[#FBF6EC] inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Volver al menú de clientes
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ADMIN VIEW
// =====================================================================
function AdminView({ menu, orders, onMenuSave, onOrderUpdate, onOrderDelete, onBack }) {
  const [tab, setTab] = useState("pedidos"); // pedidos | menu | deudas | historial
  const [draft, setDraft] = useState(menu);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fechaHistorial, setFechaHistorial] = useState(todayKey());
  const [modoHistorial, setModoHistorial] = useState("fecha"); // fecha | cliente
  const [busquedaCliente, setBusquedaCliente] = useState("");

  useEffect(() => setDraft(menu), [menu]);

  // Un pedido se considera "de prueba" si su nombre contiene la palabra PRUEBA
  // (sin importar mayúsculas/minúsculas). Estos pedidos siguen viéndose en
  // "Pedidos de hoy" para poder gestionarlos, pero NO cuentan en Deudas,
  // Historial ni en el Resumen semanal, para no inflar las estadísticas reales.
  const esPrueba = (o) => o.nombre.toLowerCase().includes("prueba");
  const ordersReales = orders.filter((o) => !esPrueba(o));

  const todaysOrders = orders.filter((o) => o.fecha === todayKey());
  const totalVendidoHoy = todaysOrders.reduce(
    (acc, o) => acc + (typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales)),
    0
  );

  const updateList = (field, idx, value) => {
    const copy = { ...draft, [field]: [...draft[field]] };
    copy[field][idx] = value;
    setDraft(copy);
  };

  // Actualiza un campo específico (nombre, proteinas o permiteArroz) de un plato de fondo
  const updateFondo = (idx, campo, value) => {
    const copy = { ...draft, fondos: draft.fondos.map((f, i) => (i === idx ? { ...f, [campo]: value } : f)) };
    setDraft(copy);
  };

  // Agrega un plato de fondo nuevo y vacío al final de la lista
  const agregarFondoMenu = () => {
    setDraft({ ...draft, fondos: [...draft.fondos, { nombre: "", proteinas: "", permiteArroz: false }] });
  };

  // Quita un plato de fondo del menú (deja al menos 1)
  const quitarFondoMenu = (idx) => {
    if (draft.fondos.length <= 1) return;
    setDraft({ ...draft, fondos: draft.fondos.filter((_, i) => i !== idx) });
  };

  const saveMenuDraft = async () => {
    await onMenuSave({ ...draft, fecha: todayKey() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  // Deudas: agrupar por cliente (nombre + telefono) sumando pedidos con pago === fiado y no pagados
  const deudas = {};
  ordersReales.forEach((o) => {
    if (!o.pagado) {
      const key = `${o.nombre}|${o.telefono}`;
      const montoPedido = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
      if (!deudas[key]) deudas[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], cantidad: 0, monto: 0 };
      deudas[key].pedidos.push(o);
      deudas[key].cantidad += 1;
      deudas[key].monto += montoPedido;
    }
  });
  const deudaList = Object.values(deudas).sort((a, b) => b.monto - a.monto);

  // Historial: lista de fechas distintas con pedidos, más recientes primero
  const fechasConPedidos = Array.from(new Set(ordersReales.map((o) => o.fecha))).sort((a, b) => b.localeCompare(a));
  const ordersDelDia = ordersReales.filter((o) => o.fecha === fechaHistorial);
  const totalDelDia = ordersDelDia.reduce(
    (acc, o) => acc + (typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales)),
    0
  );

  // Búsqueda por cliente: agrupa TODOS los pedidos (de cualquier fecha) que
  // coincidan con el nombre o teléfono buscado, sin importar si están pagados o no.
  const clientesEncontrados = (() => {
    const termino = busquedaCliente.trim().toLowerCase();
    if (!termino) return [];
    const grupos = {};
    ordersReales
      .filter(
        (o) =>
          o.nombre.toLowerCase().includes(termino) || o.telefono.toLowerCase().includes(termino)
      )
      .forEach((o) => {
        const key = `${o.nombre}|${o.telefono}`;
        const montoPedido = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
        if (!grupos[key]) {
          grupos[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], totalGastado: 0, totalDebe: 0 };
        }
        grupos[key].pedidos.push(o);
        grupos[key].totalGastado += montoPedido;
        if (!o.pagado) grupos[key].totalDebe += montoPedido;
      });
    return Object.values(grupos).sort((a, b) => b.pedidos.length - a.pedidos.length);
  })();

  // Resumen semanal: últimos 7 días (incluyendo hoy), de lunes a domingo si es posible,
  // pero simplemente toma los 7 días corridos más recientes para no depender de en qué
  // día de la semana se esté revisando.
  const resumenSemanal = (() => {
    const hoy = new Date();
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const nombresDia = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      dias.push({ fecha: key, etiqueta: nombresDia[d.getDay()], total: 0, pedidos: 0 });
    }
    const fechasSemana = new Set(dias.map((d) => d.fecha));
    const ordersSemana = ordersReales.filter((o) => fechasSemana.has(o.fecha));

    let totalSemana = 0;
    let totalDeudaSemana = 0;
    const conteoPlatos = {};
    const deudoresSemana = {};

    ordersSemana.forEach((o) => {
      const monto = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
      const diaDelPedido = dias.find((d) => d.fecha === o.fecha);
      if (diaDelPedido) {
        diaDelPedido.total += monto;
        diaDelPedido.pedidos += 1;
      }
      totalSemana += monto;
      if (!o.pagado) {
        totalDeudaSemana += monto;
        const key = `${o.nombre}|${o.telefono}`;
        if (!deudoresSemana[key]) deudoresSemana[key] = { nombre: o.nombre, telefono: o.telefono, monto: 0, pedidos: 0 };
        deudoresSemana[key].monto += monto;
        deudoresSemana[key].pedidos += 1;
      }

      (o.fondos || []).forEach((f) => {
        conteoPlatos[f.nombre] = (conteoPlatos[f.nombre] || 0) + (f.cantidad || 0);
      });
    });

    const listaDeudores = Object.values(deudoresSemana).sort((a, b) => b.monto - a.monto);

    const platosTop = Object.entries(conteoPlatos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const maxDia = Math.max(1, ...dias.map((d) => d.total));

    return { dias, totalSemana, totalDeudaSemana, platosTop, listaDeudores, totalPedidos: ordersSemana.length, maxDia };
  })();

  return (
    <div className="min-h-screen bg-[#FBF6EC]">
      <div className="bg-[#2B2622] text-[#FBF6EC] px-5 pt-6 pb-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#cfc3ad] text-sm hover:text-white">
            <ArrowLeft size={16} /> Ver como cliente
          </button>
          <div className="flex items-center gap-2">
            <Lock size={15} color="#E0A95C" />
            <span className="text-sm text-[#E0A95C]">Panel de mamá</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5">
        <div className="flex gap-1 -mt-px bg-white rounded-xl border border-[#eee2cb] p-1 mt-4 mb-5 overflow-x-auto">
          {[
            { id: "pedidos", label: `Hoy (${todaysOrders.length})` },
            { id: "menu", label: "Menú" },
            { id: "deudas", label: `Deben (${deudaList.length})` },
            { id: "historial", label: "Historial" },
            { id: "semanal", label: "Semanal" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-[13px] py-2 rounded-lg font-medium transition whitespace-nowrap ${
                tab === t.id ? "bg-[#2B2622] text-white" : "text-[#8a7d6b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "pedidos" && (
          <div className="pb-10">
            {todaysOrders.length > 0 && (
              <div className="bg-[#2B2622] rounded-2xl p-4 mb-4 flex items-center justify-between">
                <span className="text-[#cfc3ad] text-sm">Total vendido hoy</span>
                <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  S/ {totalVendidoHoy.toFixed(2)}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todaysOrders.length === 0 && (
                <div className="sm:col-span-2">
                  <EmptyState text="Aún no han llegado pedidos hoy. En cuanto alguien pida desde la página, aparece aquí al instante." />
                </div>
              )}
              {todaysOrders
                .slice()
                .reverse()
                .map((o) => (
                  <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} />
                ))}
            </div>
          </div>
        )}

        {tab === "menu" && (
          <div className="space-y-5 pb-10">
            <Field label="Platos de fondo">
              <div className="space-y-3">
                {draft.fondos.map((fondo, idx) => (
                  <div key={idx} className="rounded-xl border border-[#e8ddc8] bg-white p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[11px] uppercase tracking-wide text-[#9C7A3C]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Plato {idx + 1}
                      </span>
                      {draft.fondos.length > 1 && (
                        <button
                          onClick={() => quitarFondoMenu(idx)}
                          className="text-[#C1452D] hover:bg-[#C1452D]/8 rounded-lg p-1.5"
                          title="Quitar este plato"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <input
                      className={inputStyle}
                      value={fondo.nombre || ""}
                      onChange={(e) => updateFondo(idx, "nombre", e.target.value)}
                      placeholder="Nombre del plato"
                    />
                    <input
                      className={inputStyle}
                      value={fondo.proteinas || ""}
                      onChange={(e) => updateFondo(idx, "proteinas", e.target.value)}
                      placeholder="Opciones de proteína (opcional, separadas por coma)"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fondo.permiteArroz || false}
                        onChange={(e) => updateFondo(idx, "permiteArroz", e.target.checked)}
                        className="w-4 h-4 accent-[#C1452D]"
                      />
                      <span className="text-[13px] text-[#6b5f52]">Se puede pedir con o sin arroz</span>
                    </label>
                  </div>
                ))}
              </div>
              <button
                onClick={agregarFondoMenu}
                className="mt-2 text-[13px] text-[#5C7A4F] font-medium flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Agregar otro plato de fondo
              </button>
            </Field>

            <Field label="Entradas del día">
              <div className="space-y-2">
                {draft.entradas.map((entrada, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      className={inputStyle}
                      value={entrada}
                      onChange={(e) => updateList("entradas", idx, e.target.value)}
                      placeholder={`Entrada ${idx + 1}`}
                    />
                    <button
                      onClick={() => {
                        const copy = draft.entradas.filter((_, i) => i !== idx);
                        setDraft({ ...draft, entradas: copy });
                      }}
                      className="shrink-0 w-10 rounded-lg border border-[#e8ddc8] text-[#C1452D] flex items-center justify-center hover:bg-[#C1452D]/8"
                      title="Quitar esta entrada"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setDraft({ ...draft, entradas: [...draft.entradas, ""] })}
                className="mt-2 text-[13px] text-[#5C7A4F] font-medium flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Agregar otra entrada
              </button>
            </Field>

            <Field label="Adicionales (con precio cada uno)">
              <div className="space-y-2">
                {(draft.adicionales || []).map((ad, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      className={inputStyle}
                      value={ad.nombre}
                      onChange={(e) => {
                        const copy = draft.adicionales.map((a, i) => (i === idx ? { ...a, nombre: e.target.value } : a));
                        setDraft({ ...draft, adicionales: copy });
                      }}
                      placeholder="Ej: Huevo"
                    />
                    <div className="flex items-center shrink-0 gap-1">
                      <span className="text-[13px] text-[#8a7d6b]">S/</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className={`${inputStyle} w-20`}
                        value={ad.precio}
                        onChange={(e) => {
                          const copy = draft.adicionales.map((a, i) =>
                            i === idx ? { ...a, precio: Number(e.target.value) || 0 } : a
                          );
                          setDraft({ ...draft, adicionales: copy });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const copy = draft.adicionales.filter((_, i) => i !== idx);
                        setDraft({ ...draft, adicionales: copy });
                      }}
                      className="shrink-0 w-10 rounded-lg border border-[#e8ddc8] text-[#C1452D] flex items-center justify-center hover:bg-[#C1452D]/8"
                      title="Quitar este adicional"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setDraft({ ...draft, adicionales: [...(draft.adicionales || []), { nombre: "", precio: 0 }] })
                }
                className="mt-2 text-[13px] text-[#5C7A4F] font-medium flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Agregar otro adicional
              </button>
            </Field>

            <Field label="Refresco del día (gratis, incluido en todo pedido)">
              <input className={inputStyle} value={draft.bebida} onChange={(e) => setDraft({ ...draft, bebida: e.target.value })} placeholder="Ej: Chicha morada" />
            </Field>
            <button
              onClick={saveMenuDraft}
              className="w-full bg-[#5C7A4F] hover:bg-[#4d6841] text-white font-medium rounded-xl py-3.5 text-[15px] transition"
            >
              {savedFlash ? "✓ Menú actualizado" : "Guardar menú de hoy"}
            </button>
            <p className="text-[#8a7d6b] text-[13px] text-center">
              En cuanto guardas, todos los que abran la página ven este menú al instante. No hace falta volver a mandar nada por WhatsApp.
            </p>
          </div>
        )}

        {tab === "deudas" && (
          <div className="space-y-3 pb-10">
            {deudaList.length === 0 && <EmptyState text="Nadie debe nada registrado por ahora." />}
            {deudaList.map((d) => (
              <div key={d.nombre + d.telefono} className="bg-white rounded-2xl border border-[#eee2cb] p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <div className="font-medium text-[#2B2622]">{d.nombre}</div>
                    <div className="text-[13px] text-[#8a7d6b] flex items-center gap-1">
                      <Phone size={12} /> {d.telefono}
                    </div>
                  </div>
                  <div className="text-right">
                    <Tag color="#C1452D">S/ {d.monto.toFixed(2)}</Tag>
                    <div className="text-[11px] text-[#a89a86] mt-1">{d.cantidad} pedido{d.cantidad > 1 ? "s" : ""}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                {d.pedidos.map((p) => {
                    const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
                    const montoPedido = typeof p.total === "number" ? p.total : calcularTotal(p.fondos, p.entradas, p.modo, p.adicionales);
                    return (
                    <div key={p.id} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2 text-[13px]">
                      <span className="text-[#5c5246]">
                        {p.fecha} &middot; {resumen.length > 28 ? resumen.slice(0, 28) + "…" : resumen}
                        <span className="text-[#C1452D] font-medium"> &middot; S/ {montoPedido.toFixed(2)}</span>
                        <span className="text-[#a89a86]"> &middot; {PAY_LABELS[p.pago]}</span>
                      </span>
                      <button
                        onClick={() => onOrderUpdate(p.id, { pagado: true })}
                        className="text-[#5C7A4F] font-medium hover:underline whitespace-nowrap ml-2"
                      >
                        Marcar pagado
                      </button>
                    </div>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "historial" && (
          <div className="pb-10">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <SelectCard
                active={modoHistorial === "fecha"}
                onClick={() => setModoHistorial("fecha")}
                text="Buscar por fecha"
                compact
              />
              <SelectCard
                active={modoHistorial === "cliente"}
                onClick={() => setModoHistorial("cliente")}
                text="Buscar por cliente"
                compact
              />
            </div>

            {modoHistorial === "fecha" && (
              <>
                <Field label="Ver pedidos del día">
                  <select
                    className={inputStyle}
                    value={fechaHistorial}
                    onChange={(e) => setFechaHistorial(e.target.value)}
                  >
                    {fechasConPedidos.length === 0 && <option value={todayKey()}>Hoy &middot; {todayLabel()}</option>}
                    {fechasConPedidos.map((f) => (
                      <option key={f} value={f}>
                        {f === todayKey() ? `Hoy · ${f}` : f}
                      </option>
                    ))}
                  </select>
                </Field>

                {ordersDelDia.length > 0 && (
                  <div className="bg-[#2B2622] rounded-2xl p-4 my-4 flex items-center justify-between">
                    <span className="text-[#cfc3ad] text-sm">
                      Total vendido &middot; {ordersDelDia.length} pedido{ordersDelDia.length > 1 ? "s" : ""}
                    </span>
                    <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      S/ {totalDelDia.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {ordersDelDia.length === 0 && (
                    <div className="sm:col-span-2">
                      <EmptyState text="No hay pedidos registrados en esa fecha." />
                    </div>
                  )}
                  {ordersDelDia
                    .slice()
                    .reverse()
                    .map((o) => (
                      <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} />
                    ))}
                </div>
              </>
            )}

            {modoHistorial === "cliente" && (
              <>
                <Field label="Buscar por nombre o teléfono">
                  <input
                    className={inputStyle}
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    placeholder="Ej: María, o 999..."
                  />
                </Field>

                {busquedaCliente.trim() === "" && (
                  <div className="mt-4">
                    <EmptyState text="Escribe un nombre o número de teléfono para ver el historial completo de ese cliente, en todas las fechas." />
                  </div>
                )}

                {busquedaCliente.trim() !== "" && clientesEncontrados.length === 0 && (
                  <div className="mt-4">
                    <EmptyState text="No se encontró ningún cliente con ese nombre o teléfono." />
                  </div>
                )}

                <div className="space-y-4 mt-4">
                  {clientesEncontrados.map((c) => (
                    <div key={c.nombre + c.telefono} className="bg-white rounded-2xl border border-[#eee2cb] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-[#2B2622]">{c.nombre}</div>
                          <div className="text-[13px] text-[#8a7d6b] flex items-center gap-1">
                            <Phone size={12} /> {c.telefono}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#2B2622] font-semibold text-[15px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            S/ {c.totalGastado.toFixed(2)} <span className="text-[11px] text-[#a89a86] font-normal">en total</span>
                          </div>
                          {c.totalDebe > 0 && (
                            <div className="text-[#C1452D] text-[12px] font-medium mt-0.5">Debe S/ {c.totalDebe.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {c.pedidos
                          .slice()
                          .sort((a, b) => b.fecha.localeCompare(a.fecha))
                          .map((p) => {
                            const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
                            const montoPedido = typeof p.total === "number" ? p.total : calcularTotal(p.fondos, p.entradas, p.modo, p.adicionales);
                            const pendiente = !p.pagado;
                            return (
                              <div key={p.id} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2 text-[13px]">
                                <span className="text-[#5c5246]">
                                  {p.fecha} &middot; {resumen.length > 24 ? resumen.slice(0, 24) + "…" : resumen}
                                  <span className="text-[#9C7A3C] font-medium"> &middot; S/ {montoPedido.toFixed(2)}</span>
                                </span>
                                {pendiente ? (
                                  <span className="text-[#C1452D] font-medium whitespace-nowrap ml-2">Debe</span>
                                ) : (
                                  <span className="text-[#5C7A4F] font-medium whitespace-nowrap ml-2">Pagado</span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "semanal" && (
          <div className="pb-10">
            <p className="text-[#8a7d6b] text-[13px] mb-4">
              Resumen de los últimos 7 días &middot; útil para revisar cada sábado cómo fue la semana.
            </p>

            {/* Totales generales */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#2B2622] rounded-2xl p-4">
                <div className="text-[#cfc3ad] text-[12px] mb-1">Vendido esta semana</div>
                <div className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  S/ {resumenSemanal.totalSemana.toFixed(2)}
                </div>
                <div className="text-[#9c9082] text-[11px] mt-1">{resumenSemanal.totalPedidos} pedidos</div>
              </div>
              <div className="bg-white border border-[#eee2cb] rounded-2xl p-4">
                <div className="text-[#8a7d6b] text-[12px] mb-1">Deuda acumulada</div>
                <div className="text-[#C1452D] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  S/ {resumenSemanal.totalDeudaSemana.toFixed(2)}
                </div>
                <div className="text-[#a89a86] text-[11px] mt-1">de esta semana</div>
              </div>
            </div>

            {/* Detalle de quién debe esta semana */}
            {resumenSemanal.listaDeudores.length > 0 && (
              <div className="bg-white border border-[#eee2cb] rounded-2xl p-4 mb-5">
                <div className="text-[#2B2622] text-[14px] font-medium mb-3">Quién debe esta semana</div>
                <div className="space-y-2">
                  {resumenSemanal.listaDeudores.map((d) => (
                    <div key={d.nombre + d.telefono} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2">
                      <div>
                        <div className="text-[13px] text-[#2B2622] font-medium">{d.nombre}</div>
                        <div className="text-[11px] text-[#a89a86]">
                          {d.telefono} &middot; {d.pedidos} pedido{d.pedidos > 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-[#C1452D] font-semibold text-[14px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        S/ {d.monto.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gráfico de barras: ventas por día */}
            <div className="bg-white border border-[#eee2cb] rounded-2xl p-4 mb-5">
              <div className="text-[#2B2622] text-[14px] font-medium mb-4">Ventas por día</div>
              <div className="flex items-end justify-between gap-2 h-36">
                {resumenSemanal.dias.map((d) => {
                  const alturaPct = Math.max(4, (d.total / resumenSemanal.maxDia) * 100);
                  const esHoy = d.fecha === todayKey();
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[11px] text-[#8a7d6b]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {d.total > 0 ? d.total.toFixed(0) : ""}
                      </span>
                      <div
                        className={`w-full rounded-md transition-all ${esHoy ? "bg-[#C1452D]" : "bg-[#E0A95C]"}`}
                        style={{ height: `${alturaPct}%`, minHeight: "4px" }}
                        title={`${d.etiqueta}: S/ ${d.total.toFixed(2)}`}
                      />
                      <span className={`text-[11px] ${esHoy ? "text-[#C1452D] font-semibold" : "text-[#8a7d6b]"}`}>{d.etiqueta}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platos más pedidos */}
            <div className="bg-white border border-[#eee2cb] rounded-2xl p-4">
              <div className="text-[#2B2622] text-[14px] font-medium mb-3">Platos más pedidos</div>
              {resumenSemanal.platosTop.length === 0 && (
                <p className="text-[#a89a86] text-[13px]">Todavía no hay pedidos esta semana.</p>
              )}
              <div className="space-y-2.5">
                {resumenSemanal.platosTop.map((p, idx) => {
                  const maxCant = resumenSemanal.platosTop[0]?.cantidad || 1;
                  const anchoPct = Math.max(8, (p.cantidad / maxCant) * 100);
                  return (
                    <div key={p.nombre}>
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="text-[#3a332b]">
                          {idx + 1}. {p.nombre}
                        </span>
                        <span className="text-[#9C7A3C] font-medium">x{p.cantidad}</span>
                      </div>
                      <div className="h-1.5 bg-[#FBF6EC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#5C7A4F] rounded-full" style={{ width: `${anchoPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-[#e0d3b8]">
      <p className="text-[#8a7d6b] text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function OrderCard({ order, onUpdate, onDelete }) {
  const total = typeof order.total === "number" ? order.total : calcularTotal(order.fondos, order.entradas, order.modo, order.adicionales);

  // Las entradas guardadas en el pedido incluyen TANTO las que vinieron incluidas
  // gratis con un fondo COMO las extra pagadas aparte. Como cada línea de fondo ya
  // muestra su entrada incluida (ej. "Lomo saltado + Ensalada de palta"), aquí solo
  // mostramos las entradas EXTRA (las que sobran después de restar las incluidas),
  // para no repetir la misma entrada dos veces en la tarjeta.
  const incluidasPorNombre = {};
  (order.fondos || []).forEach((f) => {
    if (f.entradaIncluida) incluidasPorNombre[f.entradaIncluida] = (incluidasPorNombre[f.entradaIncluida] || 0) + (f.cantidad || 0);
  });
  const entradasExtra = (order.entradas || [])
    .map((e) => {
      const extra = e.cantidad - (incluidasPorNombre[e.nombre] || 0);
      return extra > 0 ? { ...e, cantidad: extra } : null;
    })
    .filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-[#eee2cb] p-4">
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="font-medium text-[#2B2622] flex items-center gap-1.5">
            {order.nombre}
            {order.nombre.toLowerCase().includes("prueba") && (
              <span className="text-[10px] uppercase font-normal text-[#9C7A3C] border border-[#9C7A3C]/40 rounded-full px-1.5 py-0.5">
                Prueba
              </span>
            )}
          </div>
          <div className="text-[13px] text-[#8a7d6b] flex items-center gap-1">
            <Phone size={12} /> {order.telefono}
            <Clock size={12} className="ml-1.5" />{" "}
            {new Date(order.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#C1452D] font-semibold text-[15px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            S/ {total.toFixed(2)}
          </div>
          <button onClick={() => onDelete(order.id)} className="text-[#c7b89a] hover:text-[#C1452D] p-1">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="text-[14px] text-[#3a332b] space-y-0.5 mb-3">
        {order.fondos.map((f, i) => (
          <div key={"f" + i}>
            {f.nombre}
            {f.proteina && <span className="text-[#9C7A3C]"> — {f.proteina}</span>}
            {f.entradaIncluida && <span className="text-[#5C7A4F]"> + {f.entradaIncluida}</span>}
            {f.arroz && <span className="text-[#9C7A3C]"> ({f.arroz === "con" ? "con arroz" : "sin arroz"})</span>}{" "}
            {f.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{f.cantidad}</span>}
          </div>
        ))}
        {entradasExtra.map((e, i) => (
          <div key={"e" + i} className="text-[#8a7d6b]">
            + {e.nombre} <span className="text-[10px] uppercase text-[#9C7A3C]">(extra)</span>{" "}
            {e.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{e.cantidad}</span>}
          </div>
        ))}
        {(order.adicionales || []).map((a, i) => (
          <div key={"a" + i} className="text-[#8a7d6b]">
            + {a.nombre} {a.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{a.cantidad}</span>}
          </div>
        ))}
        {order.bebida && (
          <div className="text-[#8a7d6b]">
            {order.bebida.nombre} {order.bebida.cantidad > 1 && <span className="text-[#C1452D] font-semibold">x{order.bebida.cantidad}</span>}
          </div>
        )}
        {order.notas && <div className="text-[#9C7A3C] italic">"{order.notas}"</div>}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag color={order.modo === "delivery" ? "#9C7A3C" : "#5C7A4F"}>
          {order.modo === "delivery" ? `Delivery: ${order.direccion}` : "Recojo en local"}
        </Tag>
        <Tag color={PAY_COLORS[order.pago]}>{PAY_LABELS[order.pago]}</Tag>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#f0e8d6]">
        <button
          onClick={() => onUpdate(order.id, { listo: !order.listo })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.listo ? "text-[#5C7A4F]" : "text-[#8a7d6b]"}`}
        >
          {order.listo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {order.listo ? "Listo" : "Marcar listo"}
        </button>
        <button
          onClick={() => onUpdate(order.id, { pagado: !order.pagado })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.pagado ? "text-[#5C7A4F]" : "text-[#C1452D]"}`}
        >
          <Wallet size={15} />
          {order.pagado ? "Pagado" : "Debe — marcar pagado"}
        </button>
      </div>
    </div>
  );
}

// =====================================================================
// ROOT APP
// =====================================================================
export default function App() {
  const [menu, setMenu] = useState(null);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("cliente"); // cliente | pin | admin
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(null);

  const refresh = useCallback(async () => {
    const [m, o] = await Promise.all([loadMenu(), loadOrders()]);
    setMenu(m);
    setOrders(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Realtime: cuando alguien hace un pedido o se actualiza el menú,
    // todos los que tengan la página abierta (ej. la tablet del local) lo ven al instante.
    const ordersChannel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        refresh();
      })
      .subscribe();

    const menuChannel = supabase
      .channel("menu-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [refresh]);

  const handleOrderSubmit = async (data) => {
    setSubmitting(true);
    try {
      const order = {
        ...data,
        fecha: todayKey(),
        creadoEn: new Date().toISOString(),
        listo: false,
        pagado: data.pago !== "fiado",
      };
      const saved = await createOrder(order);
      setOrders((prev) => [...prev, saved]);
      setJustSubmitted(saved);
    } catch (e) {
      console.error("Error al crear pedido:", e);
      alert("No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMenuSave = async (newMenu) => {
    await saveMenu(newMenu);
    setMenu(newMenu);
  };

  const handleOrderUpdate = async (id, patch) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    await updateOrder(id, patch);
  };

  const handleOrderDelete = async (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    await deleteOrder(id);
  };

  if (loading || !menu) {
    return (
      <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center">
        <Loader2 className="animate-spin" color="#C1452D" size={28} />
      </div>
    );
  }

  // El cliente nunca debe ver platos, entradas o adicionales vacíos (ej. un campo
  // que tu mamá dejó en blanco al editar el menú). El panel admin sigue viendo todo, vacío o no.
  const menuParaCliente = {
    ...menu,
    fondos: menu.fondos.filter((f) => f.nombre && f.nombre.trim() !== ""),
    entradas: menu.entradas.filter((e) => e && e.trim() !== ""),
    adicionales: (menu.adicionales || []).filter((a) => a.nombre && a.nombre.trim() !== ""),
  };

  return (
    <div>
      {view === "cliente" ? (
        <>
          <ClientView
            menu={menuParaCliente}
            onSubmit={handleOrderSubmit}
            submitting={submitting}
            justSubmitted={justSubmitted}
            onReset={() => setJustSubmitted(null)}
          />
          <button
            onClick={() => setView("pin")}
            className="fixed bottom-4 right-4 bg-[#2B2622] text-[#E0A95C] rounded-full p-3 shadow-lg opacity-70 hover:opacity-100"
            title="Panel de administración"
          >
            <Lock size={18} />
          </button>
        </>
      ) : view === "pin" ? (
        <PinScreen onUnlock={() => setView("admin")} onBack={() => setView("cliente")} />
      ) : (
        <AdminView
          menu={menu}
          orders={orders}
          onMenuSave={handleMenuSave}
          onOrderUpdate={handleOrderUpdate}
          onOrderDelete={handleOrderDelete}
          onBack={() => setView("cliente")}
        />
      )}
    </div>
  );
}
