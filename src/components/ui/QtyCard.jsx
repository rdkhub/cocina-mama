// src/components/ui/QtyCard.jsx
import React, { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

// Tarjeta de cantidad: botones - y + para elegir cuántas unidades de un plato.
// Cuando qty > 0, queda resaltada en BLANCO con borde rojo (no gris) para que se note claro que está elegida.
// priceTag (opcional) muestra el precio justo al lado del nombre, al estilo de apps de delivery
// (item + precio + selector de cantidad), para que el costo quede clarísimo antes de tocar el "+".
export function QtyCard({ text, qty, onChange, priceTag }) {
  const active = qty > 0;
  const [pop, setPop] = useState(false);

  // Protección contra doble-toque accidental en mobile: si el dedo roza el botón
  // dos veces casi al instante (típico cuando aparece contenido nuevo justo debajo
  // al agregar una unidad), el segundo toque se ignora en vez de sumar/restar de más.
  const lastTapRef = useRef(0);
  const guardedChange = (delta) => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) return;
    lastTapRef.current = now;
    onChange(delta);
    setPop(true);
  };

  return (
    <div
      onAnimationEnd={() => setPop(false)}
      className={`w-full rounded-xl border-2 flex items-center justify-between gap-3 px-3.5 py-2.5 transition ${
        active ? "border-[#C1452D] bg-white shadow-active" : "border-[#e8ddc8] bg-white"
      } ${pop ? "animate-pop" : ""}`}
    >
      <div className="flex flex-col">
        <span className={`text-[14px] ${active ? "font-semibold text-[#2B2622]" : "text-[#5c5246]"}`}>{text}</span>
        {priceTag && <span className="text-[12px] text-[#9C7A3C] font-medium">{priceTag}</span>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => guardedChange(-1)}
          disabled={qty === 0}
          style={{ touchAction: "manipulation" }}
          className="w-9 h-9 rounded-full border border-[#dccdb4] text-[#6E6253] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
        >
          <Minus size={15} />
        </button>
        <span className={`w-5 text-center text-[15px] font-semibold ${active ? "text-[#C1452D]" : "text-[#B8A684]"}`}>{qty}</span>
        <button
          onClick={() => guardedChange(1)}
          style={{ touchAction: "manipulation" }}
          className="w-9 h-9 rounded-full bg-[#C1452D] text-white flex items-center justify-center active:bg-[#a93a25]"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
