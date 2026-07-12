// src/components/admin/PinScreen.jsx
import React, { useState } from "react";
import { Lock, ArrowLeft } from "lucide-react";

const ADMIN_PIN = "1234"; // cámbialo aquí por el PIN que quieras usar en el local

export function PinScreen({ onUnlock, onBack }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const tryUnlock = (value) => {
    if (value === ADMIN_PIN) {
      onUnlock();
    } else if (value.length >= ADMIN_PIN.length) {
      setError(true);
      setTimeout(() => setError(false), 600);
      setPin("");
    }
  };

  const press = (d) => {
    const next = (pin + d).slice(0, ADMIN_PIN.length);
    setPin(next);
    if (next.length === ADMIN_PIN.length) tryUnlock(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#332A21] to-[#211B16] flex items-center justify-center px-5">
      <div className="max-w-xs w-full text-center">
        <Lock size={28} color="#E0A95C" className="mx-auto mb-4" />
        <h2 className="font-display text-xl text-[#FBF6EC] mb-1">Panel de mamá</h2>
        <p className="text-[#9c9082] text-sm mb-7">Ingresa el PIN para entrar</p>

        <div className={`flex justify-center gap-3 mb-8 ${error ? "animate-pulse" : ""}`}>
          {Array.from({ length: ADMIN_PIN.length }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                borderColor: error ? "#C1452D" : "#E0A95C",
                backgroundColor: i < pin.length ? (error ? "#C1452D" : "#E0A95C") : "transparent",
              }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            onClick={() => press("0")}
            className="aspect-square rounded-2xl bg-[#3a342c] text-[#FBF6EC] text-xl font-medium hover:bg-[#464036] transition"
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            className="aspect-square rounded-2xl text-[#9c9082] text-sm font-medium hover:bg-[#3a342c] transition"
          >
            Borrar
          </button>
        </div>

        <button onClick={onBack} className="text-[#9c9082] text-sm hover:text-[#FBF6EC] inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Volver al menú de clientes
        </button>
      </div>
    </div>
  );
}
