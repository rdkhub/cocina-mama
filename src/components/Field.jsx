// src/components/ui/Field.jsx
import React from "react";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5 text-[#6b5f52] font-medium">{label}</span>
      {children}
    </label>
  );
}
