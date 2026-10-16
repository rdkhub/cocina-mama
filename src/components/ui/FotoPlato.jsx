// src/components/ui/FotoPlato.jsx
import React, { useState } from "react";
import { Salad, Soup, CakeSlice, CupSoda, CirclePlus } from "lucide-react";
import { COLORES_CATEGORIA } from "../../lib/imagenMenu";

const ICONOS = { entrada: Salad, segundo: Soup, postre: CakeSlice, bebida: CupSoda, adicional: CirclePlus };

// Foto del plato. Si no tiene foto (o no carga), muestra un fondo con el
// color de su categoría y un ícono dibujado, para que nunca se vea un hueco.
export function FotoPlato({ plato, className = "", iconSize = 34, rounded = "rounded-xl" }) {
  const [fallo, setFallo] = useState(false);
  const cat = plato?.categoria || "segundo";
  const Icono = ICONOS[cat] || Soup;
  const [a, b] = COLORES_CATEGORIA[cat] || COLORES_CATEGORIA.segundo;

  if (plato?.fotoUrl && !fallo) {
    return (
      <img
        src={plato.fotoUrl}
        alt={plato.nombre}
        loading="lazy"
        decoding="async"
        onError={() => setFallo(true)}
        className={`object-cover bg-arena ${rounded} ${className}`}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden flex items-center justify-center ${rounded} ${className}`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: "radial-gradient(circle at 30% 30%, #fff 0 2px, transparent 3px)",
          backgroundSize: "18px 18px",
        }}
      />
      <Icono size={iconSize} strokeWidth={1.6} color="#FBF6EC" className="relative drop-shadow-sm" />
    </div>
  );
}
