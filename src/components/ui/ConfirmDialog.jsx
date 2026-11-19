// src/components/ui/ConfirmDialog.jsx

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
        <h3 id="confirm-dialog-title" className="font-display text-lg text-tinta mb-2">
          {title}
        </h3>
        <p className="text-texto-secundario text-[14px] leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-arena-oscura text-texto-inactivo font-medium text-[14px] hover:bg-crema-hover transition active:scale-[0.97]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-medium text-[14px] ${
              danger ? "btn-cta bg-terracota hover:bg-terracota-oscura" : "btn-cta-salvia bg-salvia hover:bg-salvia-oscura"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}