// src/components/ui/SelectCard.jsx
import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export function SelectCard({ active, onClick, text, compact, icon }) {
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
