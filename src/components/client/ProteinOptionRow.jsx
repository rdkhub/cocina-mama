// src/components/client/ProteinOptionRow.jsx
import React, { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

// Fila de contador para UNA opción de proteína dentro de un plato de fondo
// (ej: "Milanesa" con su propio +/-). Antes esto vivía inline dentro de
// OrderForm.jsx sin protección contra doble-toque; se extrajo a su propio
// componente para poder usar useRef y aplicar el mismo "seguro" de 250ms
// que ya tiene QtyCard, evitando que un toque roce el botón equivocado.
export function ProteinOptionRow({ label, cantidad, onIncrement, onDecrement }) {
  const [pop, setPop] = useState(false);
  const lastTapRef = useRef(0);
  const guarded = (fn) => () => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) return;
    lastTapRef.current = now;
    fn();
    setPop(true);
  };

  return (
    <div
      onAnimationEnd={() => setPop(false)}
      className={`flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2.5 ${pop ? "animate-pop" : ""}`}
    >
      <span className={`text-[13px] ${cantidad > 0 ? "font-medium text-[#2B2622]" : "text-[#6E6253]"}`}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={guarded(onDecrement)}
          disabled={cantidad === 0}
          style={{ touchAction: "manipulation" }}
          className="w-8 h-8 rounded-full border border-[#dccdb4] text-[#6E6253] flex items-center justify-center disabled:opacity-30 active:bg-[#f0e8d6]"
        >
          <Minus size={13} />
        </button>
        <span className={`w-4 text-center text-[14px] font-semibold ${cantidad > 0 ? "text-[#C1452D]" : "text-[#B8A684]"}`}>
          {cantidad}
        </span>
        <button
          onClick={guarded(onIncrement)}
          style={{ touchAction: "manipulation" }}
          className="w-8 h-8 rounded-full bg-[#C1452D] text-white flex items-center justify-center active:bg-[#a93a25]"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
