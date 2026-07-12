// src/components/ui/Row.jsx
import React from "react";

export function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#f0e8d6] last:border-0">
      <span className="text-[#6E6253]">{label}</span>
      <span className="text-[#2B2622] font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
