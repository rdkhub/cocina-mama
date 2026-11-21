// src/components/ui/SelectCard.jsx
import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

export function SelectCard({ active, onClick, text, compact, icon }) {
  const [pop, setPop] = useState(false);
  return (
    <button
      onClick={() => {
        onClick();
        setPop(true);
      }}
      onAnimationEnd={() => setPop(false)}
      className={`w-full text-left rounded-xl border-2 transition flex items-center gap-2 ${
        compact ? "px-3 py-2.5 justify-center text-center" : "px-3.5 py-3"
      } ${
        active
          ? "border-terracota bg-white text-tinta font-semibold shadow-active"
          : "border-arena bg-white text-texto-inactivo hover:border-arena-hover"
      } ${pop ? "animate-pop" : ""}`}
    >
      {icon}
      <span className={`text-[14px] ${active ? "font-medium" : ""}`}>{text}</span>
      {!compact && (
        <span className="ml-auto">
          {/* Estos dos colores quedan en hex a propósito: son props de color
              del ícono (SVG), no clases de Tailwind, así que el sistema de
              tokens no aplica aquí de la misma forma. */}
          {active ? <CheckCircle2 size={18} color="#C1452D" /> : <Circle size={18} color="#d8c8a6" />}
        </span>
      )}
    </button>
  );
}