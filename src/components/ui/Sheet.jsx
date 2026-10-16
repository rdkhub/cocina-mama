// src/components/ui/Sheet.jsx
import React, { useEffect } from "react";
import { X } from "lucide-react";

// Panel que sube desde abajo (en celular) o ventana centrada (en pantallas
// grandes). Se cierra tocando fuera, con la X o con la tecla Escape.
export function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45 animate-fade" onClick={onClose} />
      <div className="relative bg-crema w-full sm:max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-sube">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10" />
          <div className="w-10 h-1.5 rounded-full bg-arena-oscura sm:hidden" />
          <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-texto-secundario hover:bg-arena/60">
            <X size={20} />
          </button>
        </div>
        {title && <h2 className="font-display text-xl text-tinta px-5 pb-3">{title}</h2>}
        <div className="overflow-y-auto px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-divisor bg-crema rounded-b-3xl">{footer}</div>}
      </div>
    </div>
  );
}
