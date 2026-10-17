// src/components/admin/PinScreen.jsx
import React, { useState } from "react";
import { Lock, ArrowLeft, Loader2 } from "lucide-react";
import { PIN_MINIMO, PIN_MAXIMO } from "../../lib/auth";

// El PIN se verifica en el servidor (Supabase Auth). Aquí no hay ningún PIN
// guardado: onUnlock(pin) lanza un error si no es correcto.
export function PinScreen({ onUnlock, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  const entrar = async () => {
    if (pin.length < PIN_MINIMO || verificando) return;
    setVerificando(true);
    setError("");
    try {
      await onUnlock(pin);
    } catch (e) {
      setError(e.message || "PIN incorrecto");
      setPin("");
    } finally {
      setVerificando(false);
    }
  };

  const press = (d) => {
    if (verificando) return;
    setError("");
    setPin((p) => (p + d).slice(0, PIN_MAXIMO));
  };

  const tecla = "aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition disabled:opacity-50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#332A21] to-[#211B16] flex items-center justify-center px-5">
      <div className="max-w-xs w-full text-center">
        <Lock size={28} color="#E0A95C" className="mx-auto mb-4" />
        <h2 className="font-display text-xl text-[#FBF6EC] mb-1">Panel de mamá</h2>
        <p className="text-[#9c9082] text-sm mb-7">Ingresa el PIN para entrar</p>

        <div className={`flex justify-center gap-3 mb-3 h-4 ${error ? "animate-pulse" : ""}`}>
          {Array.from({ length: Math.max(PIN_MINIMO, pin.length) }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                borderColor: error ? "#C1452D" : "#E0A95C",
                backgroundColor: i < pin.length ? "#E0A95C" : "transparent",
              }}
            />
          ))}
        </div>
        <p className="text-[#E07a62] text-sm h-5 mb-4" role="alert">
          {error}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} onClick={() => press(d)} disabled={verificando} className={tecla}>
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            disabled={verificando}
            className="aspect-square rounded-2xl text-[#9c9082] text-sm font-medium hover:bg-[#3a342c] transition"
          >
            Borrar
          </button>
          <button onClick={() => press("0")} disabled={verificando} className={tecla}>
            0
          </button>
          <button
            onClick={entrar}
            disabled={pin.length < PIN_MINIMO || verificando}
            className="aspect-square rounded-2xl bg-terracota text-white text-sm font-semibold transition disabled:bg-[#3a342c] disabled:text-[#6f665a] flex items-center justify-center"
          >
            {verificando ? <Loader2 size={20} className="animate-spin" /> : "Entrar"}
          </button>
        </div>

        <button onClick={onBack} className="text-[#9c9082] text-sm hover:text-[#FBF6EC] inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Volver al menú de clientes
        </button>
      </div>
    </div>
  );
}
