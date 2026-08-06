// src/components/ui/ConfirmDialog.jsx
import React from "react";

// Modal de confirmación reutilizable para acciones que no se pueden deshacer
// (ej: borrar un pedido). "danger" cambia el color del botón de confirmar
// de terracota (acción destructiva) a verde (acción neutral/positiva).
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  danger = true,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-5 max-w-sm w-full">
        <h3 id="confirm-dialog-title" className="font-display text-lg text-[#2B2622] mb-2">
          {title}
        </h3>
        <p className="text-[#6E6253] text-[14px] leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-[#dccdb4] text-[#5c5246] font-medium text-[14px] hover:bg-[#f7f1e3] transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-medium text-[14px] transition ${
              danger ? "bg-[#C1452D] hover:bg-[#a93a25]" : "bg-[#5C7A4F] hover:bg-[#4d6841]"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
