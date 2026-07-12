// src/components/ui/QtyCard.jsx
import React from "react";
import { Minus, Plus } from "lucide-react";

// Tarjeta de cantidad: botones - y + para elegir cuántas unidades de un plato.
// Cuando qty > 0, queda resaltada en BLANCO con borde rojo (no gris) para que se note claro que está elegida.
// priceTag (opcional) muestra el precio justo al lado del nombre, al estilo de apps de delivery
// (item + precio + selector de cantidad), para que el costo quede clarísimo antes de tocar el "+".
export function QtyCard({ text, qty, onChange, priceTag }) {
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
          className="w-7 h-7 rounded-full border border-[#dccdb4] text-[#6E6253] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
        >
          <Minus size={14} />
        </button>
        <span className={`w-5 text-center text-[15px] font-semibold ${active ? "text-[#C1452D]" : "text-[#B8A684]"}`}>{qty}</span>
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
