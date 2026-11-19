// src/components/ui/Switch.jsx

// Interruptor grande, fácil de tocar con el dedo.
export function Switch({ checked, onChange, label, color = "#C1452D", disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{ backgroundColor: checked ? color : "#dccdb4", touchAction: "manipulation" }}
      className="relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50"
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
