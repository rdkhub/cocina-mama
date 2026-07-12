// src/components/ui/Tag.jsx
import React from "react";

export function Tag({ children, color }) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.7rem",
        letterSpacing: "0.04em",
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        border: `1px solid ${color}`,
        color: color,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
