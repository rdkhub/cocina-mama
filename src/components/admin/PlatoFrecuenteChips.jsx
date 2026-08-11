// src/components/admin/PlatoFrecuenteChips.jsx
import React from "react";

// Chips con los platos que ya se han usado antes, para agregarlos al menú
// de hoy con un solo toque en vez de escribirlos de nuevo. La lista crece
// sola: cada vez que se guarda el menú, cualquier plato nuevo (o con
// proteínas distintas a las que tenía) queda memorizado aquí para la
// próxima vez — no hace falta ninguna acción extra para "enseñarle" platos.
export function PlatoFrecuenteChips({ platos, onSelect }) {
  if (!platos || platos.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="text-[11px] text-texto-terciario uppercase tracking-wide mb-1.5">
        Platos frecuentes · toca para agregar
      </p>
      <div className="flex flex-wrap gap-1.5">
        {platos.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="text-[12px] px-3 py-1.5 rounded-full border-2 border-arena bg-white text-texto-inactivo hover:border-terracota hover:text-tinta transition"
          >
            + {p.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
