// src/components/admin/PlatoChecklist.jsx
import React, { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

// Checklist de platos para armar el menú de hoy. Los platos que necesitan
// proteína (Lentejas, Frejoles...) se despliegan para marcar, CADA DÍA DE
// CERO, cuáles proteínas van con ese plato — nunca se recuerda lo elegido
// el día anterior, porque eso cambia según lo que haya. Los platos que ya
// llevan proteína incluida (Arroz con pollo, Lomo saltado...) se agregan
// con un solo toque, sin desplegar nada.
export function PlatoChecklist({
  platosLibrary,
  proteinasLibrary,
  fondosSeleccionados,
  onToggleDish,
  onToggleProtein,
  onCrearPlato,
  onCrearProteina,
}) {
  const [expandido, setExpandido] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoRequiereProteina, setNuevoRequiereProteina] = useState(false);
  const [nuevoPermiteArroz, setNuevoPermiteArroz] = useState(false);
  const [agregandoProteinaA, setAgregandoProteinaA] = useState(null);
  const [nuevaProteinaNombre, setNuevaProteinaNombre] = useState("");

  // Encuentra si un plato ya está en el menú de hoy, comparando el nombre
  // SIN espacios de más ni importar mayúsculas — así atrapa cualquier plato
  // viejo que haya quedado guardado con un espacio extra invisible.
  const normalizar = (nombre) => (nombre || "").trim().toLowerCase();
  const seleccionado = (plato) => fondosSeleccionados.find((f) => normalizar(f.nombre) === normalizar(plato.nombre));
  const proteinasDe = (plato) => {
    const f = seleccionado(plato);
    if (!f || !f.proteinas) return [];
    return f.proteinas.split(",").map((p) => p.trim()).filter(Boolean);
  };

  const guardarPlatoNuevo = () => {
    if (!nuevoNombre.trim()) return;
    onCrearPlato({ nombre: nuevoNombre.trim(), requiereProteina: nuevoRequiereProteina, permiteArroz: nuevoPermiteArroz });
    setNuevoNombre("");
    setNuevoRequiereProteina(false);
    setNuevoPermiteArroz(false);
    setMostrarForm(false);
  };

  const guardarProteinaNueva = () => {
    if (!nuevaProteinaNombre.trim()) return;
    onCrearProteina(nuevaProteinaNombre.trim());
    setNuevaProteinaNombre("");
    setAgregandoProteinaA(null);
  };

  return (
    <div className="space-y-2">
      {platosLibrary.length === 0 && (
        <p className="text-texto-terciario text-[13px] italic">
          Todavía no hay platos guardados. Agrega el primero abajo.
        </p>
      )}

      {platosLibrary.map((plato) => {
        const activo = !!seleccionado(plato);

        if (!plato.requiereProteina) {
          return (
            <button
              key={plato.id}
              onClick={() => onToggleDish(plato)}
              className={`w-full flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left transition ${
                activo ? "border-terracota bg-white" : "border-arena bg-white"
              }`}
            >
              <span
                className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 transition ${
                  activo ? "bg-terracota border-terracota" : "border-arena-oscura"
                }`}
              />
              <span className={`text-[14px] ${activo ? "font-semibold text-tinta" : "text-texto-inactivo"}`}>{plato.nombre}</span>
            </button>
          );
        }

        const abierto = expandido === plato.id;
        const proteinasElegidas = proteinasDe(plato);

        return (
          <div key={plato.id} className={`rounded-xl border-2 bg-white overflow-hidden transition ${activo ? "border-terracota" : "border-arena"}`}>
            <button onClick={() => setExpandido(abierto ? null : plato.id)} className="w-full flex items-center justify-between px-3.5 py-3 text-left">
              <span className={`text-[14px] ${activo ? "font-semibold text-tinta" : "text-texto-inactivo"}`}>
                {plato.nombre}
                {activo && (
                  <span className="text-ocre font-normal text-[12px]">
                    {" "}
                    · {proteinasElegidas.length} elegida{proteinasElegidas.length !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
              <ChevronDown size={16} className={`text-ocre shrink-0 transition-transform ${abierto ? "rotate-180" : ""}`} />
            </button>

            {abierto && (
              <div className="px-3.5 pb-3.5 flex flex-wrap gap-1.5">
                {proteinasLibrary.length === 0 && (
                  <p className="text-texto-terciario text-[12px] italic">Todavía no hay proteínas guardadas.</p>
                )}
                {proteinasLibrary.map((prot) => {
                  const marcada = proteinasElegidas.includes(prot.nombre);
                  return (
                    <button
                      key={prot.id}
                      onClick={() => onToggleProtein(plato, prot.nombre)}
                      className={`text-[12px] px-3 py-1.5 rounded-full border-2 transition ${
                        marcada ? "border-terracota bg-white font-semibold text-tinta" : "border-arena bg-white text-texto-inactivo"
                      }`}
                    >
                      {prot.nombre}
                    </button>
                  );
                })}

                {agregandoProteinaA === plato.id ? (
                  <div className="flex items-center gap-1.5 w-full mt-1">
                    <input
                      autoFocus
                      value={nuevaProteinaNombre}
                      onChange={(e) => setNuevaProteinaNombre(e.target.value)}
                      placeholder="Ej: Pescado frito"
                      className="flex-1 text-[12px] rounded-full border-2 border-arena px-3 py-1.5 outline-none focus:border-terracota"
                    />
                    <button onClick={guardarProteinaNueva} className="text-[12px] px-3 py-1.5 rounded-full bg-terracota text-white font-medium shrink-0">
                      Agregar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAgregandoProteinaA(plato.id)}
                    className="text-[12px] px-3 py-1.5 rounded-full border-2 border-dashed border-arena-oscura text-texto-terciario flex items-center gap-1"
                  >
                    <Plus size={12} /> Nueva proteína
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {mostrarForm ? (
        <div className="rounded-xl border-2 border-dashed border-arena-oscura p-3.5 space-y-2.5">
          <input
            autoFocus
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre del plato nuevo"
            className="w-full text-[14px] rounded-lg border border-arena-oscura px-3 py-2 outline-none focus:border-terracota"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={nuevoRequiereProteina}
              onChange={(e) => setNuevoRequiereProteina(e.target.checked)}
              className="w-4 h-4 accent-terracota"
            />
            <span className="text-[13px] text-texto-secundario">Necesita elegir proteína (ej: lentejas, frejoles)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={nuevoPermiteArroz}
              onChange={(e) => setNuevoPermiteArroz(e.target.checked)}
              className="w-4 h-4 accent-terracota"
            />
            <span className="text-[13px] text-texto-secundario">Se puede pedir con o sin arroz</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setMostrarForm(false)} className="flex-1 text-[13px] py-2 rounded-lg border border-arena-oscura text-texto-inactivo">
              Cancelar
            </button>
            <button onClick={guardarPlatoNuevo} className="flex-1 text-[13px] py-2 rounded-lg bg-terracota text-white font-medium">
              Guardar plato
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setMostrarForm(true)}
          className="w-full text-[13px] text-salvia font-medium flex items-center justify-center gap-1 py-2.5 border-2 border-dashed border-arena-oscura rounded-xl hover:bg-crema-hover transition"
        >
          <Plus size={14} /> Agregar plato nuevo a la biblioteca
        </button>
      )}
    </div>
  );
}
