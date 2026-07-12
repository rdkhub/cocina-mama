// src/components/admin/tabs/MenuTab.jsx
import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field } from "../../ui";

// NOTA: este inputStyle es el mismo que usa OrderForm.jsx. Está duplicado a
// propósito para no acoplar el panel de admin con el flujo de cliente — en la
// Fase 2 (pulido de UX) lo podemos mover a un solo lugar compartido si tiene sentido.
const inputStyle =
  "w-full rounded-lg border border-[#dccdb4] bg-[#FFFDF8] px-3.5 py-2.5 text-[15px] text-[#2B2622] placeholder-[#998C76] outline-none focus:border-[#C1452D] focus:ring-2 focus:ring-[#C1452D]/15 transition";

export function MenuTab({ draft, setDraft, updateList, updateFondo, agregarFondoMenu, quitarFondoMenu, saveMenuDraft, savedFlash }) {
  return (
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
                <span className="text-[13px] text-[#6E6253]">S/</span>
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
      <p className="text-[#6E6253] text-[13px] text-center">
        En cuanto guardas, todos los que abran la página ven este menú al instante. No hace falta volver a mandar nada por WhatsApp.
      </p>
    </div>
  );
}
