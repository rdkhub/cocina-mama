// src/components/admin/tabs/MenuTab.jsx
import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputStyle } from "../../ui";
import { AvisoGenerator } from "../AvisoGenerator";
import { PlatoChecklist } from "../PlatoChecklist";

export function MenuTab({
  draft,
  setDraft,
  updateList,
  saveMenuDraft,
  savedFlash,
  platosLibrary,
  proteinasLibrary,
  onToggleDish,
  onToggleProtein,
  onCrearPlato,
  onCrearProteina,
}) {
  return (
    <div className="space-y-5 pb-10">
      <Field label="Platos de fondo — elige los de hoy">
        <PlatoChecklist
          platosLibrary={platosLibrary}
          proteinasLibrary={proteinasLibrary}
          fondosSeleccionados={draft.fondos}
          onToggleDish={onToggleDish}
          onToggleProtein={onToggleProtein}
          onCrearPlato={onCrearPlato}
          onCrearProteina={onCrearProteina}
        />
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
        En cuanto guardas, todos los que abran la página ven este menú al instante.
      </p>

      {/* Genera un texto listo para copiar y pegar en WhatsApp/Facebook con
          los platos de este mismo menú. No requiere haber guardado primero. */}
      <AvisoGenerator draft={draft} />
    </div>
  );
}
