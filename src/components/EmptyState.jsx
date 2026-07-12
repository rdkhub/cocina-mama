// src/components/ui/EmptyState.jsx
import React from "react";

export function EmptyState({ text }) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-2xl border border-dashed border-[#e0d3b8]">
      <p className="text-[#6E6253] text-sm leading-relaxed">{text}</p>
    </div>
  );
}
