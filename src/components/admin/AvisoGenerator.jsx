// src/components/admin/AvisoGenerator.jsx
import React, { useState } from "react";
import { Copy, Check, Megaphone } from "lucide-react";
import { generarTextoAviso } from "../../utils/aviso";
import { APP_URL } from "../../utils/contacto";
import { useApp } from "../../context/AppContext";

// Genera un texto listo para copiar y pegar en WhatsApp/Facebook a partir
// del menú que se está editando. El texto queda en un cuadro editable antes
// de copiar, por si se quiere ajustar el tono a mano sin tener que tocar
// código ni volver a escribir todo desde cero.
export function AvisoGenerator({ draft }) {
  const { showToast } = useApp();
  const [texto, setTexto] = useState("");
  const [visible, setVisible] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const generar = () => {
    setTexto(generarTextoAviso(draft, APP_URL));
    setVisible(true);
    setCopiado(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      console.error("Error al copiar:", e);
      showToast("No se pudo copiar automáticamente. Selecciona el texto y cópialo con Ctrl+C.");
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-arena">
      <button
        onClick={generar}
        className="w-full bg-tinta hover:bg-tinta-media text-white font-medium rounded-xl py-3.5 text-[15px] transition flex items-center justify-center gap-2"
      >
        <Megaphone size={17} />
        Generar aviso para WhatsApp
      </button>

      {visible && (
        <div className="mt-4 space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-arena-oscura bg-input-bg px-3.5 py-3 text-[14px] text-tinta leading-relaxed outline-none focus:border-terracota focus:ring-2 focus:ring-terracota/15 transition"
          />
          <button
            onClick={copiar}
            className={`w-full font-medium rounded-xl py-3.5 text-[15px] transition flex items-center justify-center gap-2 ${
              copiado ? "bg-salvia text-white" : "bg-terracota hover:bg-terracota-oscura text-white"
            }`}
          >
            {copiado ? <Check size={18} /> : <Copy size={18} />}
            {copiado ? "¡Copiado! Ya lo puedes pegar en WhatsApp" : "Copiar aviso"}
          </button>
          <p className="text-texto-terciario text-[12px] text-center">Puedes editar el texto arriba antes de copiarlo.</p>
        </div>
      )}
    </div>
  );
}
