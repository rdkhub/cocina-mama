// src/components/ui/Toast.jsx
import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Aviso breve en la parte superior de la pantalla. Se usa principalmente
// para avisar cuando una acción del panel admin falla (ej: no se pudo
// guardar "pagado" por falta de conexión), para que quien lo usa sepa que
// tiene que reintentar en vez de asumir que ya se guardó.
export function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.variant !== "success";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4" role="status" aria-live="polite">
      <div
        className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg text-[14px] font-medium ${
          isError ? "bg-[#C1452D] text-white" : "bg-[#5C7A4F] text-white"
        }`}
      >
        {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
        {toast.message}
      </div>
    </div>
  );
}
