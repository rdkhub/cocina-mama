// src/components/client/EstadoLocal.jsx
// Aviso "Abierto ahora · hasta las 4" / "Abrimos mañana a las 12" que se
// actualiza solo cada minuto, con la hora de Lima.
import { useEffect, useState } from "react";
import { estadoLocal } from "../../utils/horario";

export function EstadoLocal({ claro = false, className = "" }) {
  const [estado, setEstado] = useState(() => estadoLocal());
  useEffect(() => {
    const t = setInterval(() => setEstado(estadoLocal()), 60_000);
    return () => clearInterval(t);
  }, []);
  const colores = estado.abierto
    ? claro
      ? "bg-[#5CE08A]/15 text-[#7BEA9F]"
      : "bg-salvia/10 text-salvia-oscura"
    : claro
      ? "bg-white/10 text-[#e6dccb]"
      : "bg-tinta/5 text-texto-secundario";
  return (
    <span className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-[13px] leading-snug font-semibold ${colores} ${className}`}>
      <span className={`relative flex shrink-0 w-2 h-2 rounded-full ${estado.abierto ? "bg-[#3ccf6e]" : "bg-current opacity-60"}`} aria-hidden />
      {estado.texto}
    </span>
  );
}
