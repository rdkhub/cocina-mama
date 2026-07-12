// src/components/client/OrderForm.jsx
import React from "react";
import { Minus, Plus } from "lucide-react";
import { Field, QtyCard, SelectCard } from "../ui";
import { Store, MapPin } from "lucide-react";
import { PAY_LABELS } from "../../utils/pedidos";

export const inputStyle =
  "w-full rounded-lg border border-[#dccdb4] bg-[#FFFDF8] px-3.5 py-2.5 text-[15px] text-[#2B2622] placeholder-[#998C76] outline-none focus:border-[#C1452D] focus:ring-2 focus:ring-[#C1452D]/15 transition";

// Formulario principal donde el cliente arma su pedido. Recibe TODO el estado
// y los manejadores de eventos como props desde ClientView (el componente
// "contenedor" que guarda el estado real). Esto mantiene OrderForm como un
// componente puramente presentacional: fácil de leer, fácil de testear.
export function OrderForm({
  menu,
  nombre,
  setNombre,
  telefono,
  setTelefono,
  fondoSeleccion,
  fondoQty,
  arrozElegido,
  setArrozElegido,
  entradaExtraQty,
  setEntradaExtraQty,
  adicionalQty,
  setAdicionalQty,
  modo,
  setModo,
  direccion,
  setDireccion,
  pago,
  setPago,
  notas,
  setNotas,
  opcionesProteina,
  agregarFondo,
  quitarFondo,
  contarProteina,
  elegirEntradaDeUnidad,
  bump,
}) {
  return (
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
                    <div className="text-[11px] text-[#6E6253] mb-1.5">
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
                        <span className={`text-[13px] ${cant > 0 ? "font-medium text-[#2B2622]" : "text-[#6E6253]"}`}>{op}</span>
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => quitarFondo(i, op)}
                            disabled={cant === 0}
                            className="w-6 h-6 rounded-full border border-[#dccdb4] text-[#6E6253] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
                          >
                            <Minus size={12} />
                          </button>
                          <span className={`w-4 text-center text-[14px] font-semibold ${cant > 0 ? "text-[#C1452D]" : "text-[#B8A684]"}`}>
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
          <p className="text-[12px] text-[#6E6253] -mt-1 mb-1">
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
    </div>
  );
}
