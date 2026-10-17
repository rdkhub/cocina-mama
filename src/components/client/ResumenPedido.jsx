// src/components/client/ResumenPedido.jsx
import React from "react";
import { Minus, Plus, AlertCircle } from "lucide-react";
import { FotoPlato } from "../ui";
import { soles } from "../../utils/pedidos";

function Stepper({ cantidad, onCambiar, nombre }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onCambiar(-1)}
        aria-label={`Quitar uno: ${nombre}`}
        style={{ touchAction: "manipulation" }}
        className="w-8 h-8 rounded-full border border-arena-oscura text-texto-secundario flex items-center justify-center active:bg-divisor"
      >
        <Minus size={14} />
      </button>
      <span className="w-4 text-center text-[15px] font-semibold text-tinta">{cantidad}</span>
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label={`Agregar uno: ${nombre}`}
        style={{ touchAction: "manipulation" }}
        className="w-8 h-8 rounded-full border border-arena-oscura text-texto-secundario flex items-center justify-center active:bg-divisor"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// Lista editable de lo que lleva el cliente. "lineas" viene armado desde
// ClientView: { key, plato, foto, titulo, detalle, precioUnit, cantidad, problema, onCambiar }.
export function ResumenPedido({ lineas, total, compacto }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-[#eee2cb] divide-y divide-divisor">
      {lineas.map((l) => (
        <div key={l.key} className="flex items-center gap-3 p-3">
          {!compacto && <FotoPlato plato={l.plato} src={l.foto} className="w-12 h-12 shrink-0" iconSize={20} />}
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-tinta leading-snug">{l.titulo}</div>
            {l.detalle && <div className="text-[12.5px] text-texto-secundario leading-snug">{l.detalle}</div>}
            {l.problema ? (
              <div className="text-[12.5px] text-terracota font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle size={13} /> {l.problema}
              </div>
            ) : (
              <div className="text-[12.5px] text-ocre font-medium">{soles(l.precioUnit * l.cantidad)}</div>
            )}
          </div>
          <Stepper cantidad={l.cantidad} onCambiar={l.onCambiar} nombre={l.titulo} />
        </div>
      ))}
      <div className="flex items-center justify-between px-3.5 py-3 bg-crema/60 rounded-b-2xl">
        <span className="text-[14px] text-texto-secundario">Total</span>
        <span className="font-mono text-[17px] font-semibold text-terracota">{soles(total)}</span>
      </div>
    </div>
  );
}
