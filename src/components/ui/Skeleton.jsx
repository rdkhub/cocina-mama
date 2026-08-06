// src/components/ui/Skeleton.jsx
import React from "react";

// Pantalla de carga que imita la forma del menú en vez de un spinner
// genérico. Se siente más rápida aunque tarde lo mismo, porque el ojo ya
// reconoce la estructura de la página antes de que lleguen los datos reales.
export function Skeleton() {
  return (
    <div className="min-h-screen bg-[#FBF6EC] px-5 pt-9 max-w-md mx-auto" aria-busy="true" aria-label="Cargando el menú">
      <div className="h-4 w-2/5 bg-[#e8ddc8] rounded animate-shimmer mb-6" />
      <div className="h-16 bg-[#e8ddc8] rounded-xl animate-shimmer mb-3" />
      <div className="h-16 bg-[#e8ddc8] rounded-xl animate-shimmer mb-3" />
      <div className="h-16 bg-[#e8ddc8] rounded-xl animate-shimmer mb-3" />
      <div className="h-16 bg-[#e8ddc8] rounded-xl animate-shimmer" />
    </div>
  );
}
