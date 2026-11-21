// src/components/client/Encuentranos.jsx
// Dónde queda Cocina de Mamá, a qué hora atiende y cómo escribirle.
// El mapa de Google se carga solo cuando el cliente lo pide (es pesado).
import { useState } from "react";
import { m } from "motion/react";
import { MapPin, Clock, MessageCircle, Copy, Check, Navigation, Map as MapIcon } from "lucide-react";
import { vibrar, avisar } from "../ui";
import { DIRECCION, MAPA_URL, MAPA_EMBED_URL, WHATSAPP_URL, WHATSAPP_VISIBLE, WHATSAPP_NUMBER } from "../../utils/contacto";
import { HORARIO } from "../../utils/horario";
import { EstadoLocal } from "./EstadoLocal";

function Fila({ Icono, titulo, children }) {
  return (
    <div className="flex gap-3">
      <span className="w-10 h-10 rounded-full bg-terracota/10 text-terracota flex items-center justify-center shrink-0">
        <Icono size={19} />
      </span>
      <div className="min-w-0 pt-0.5">
        <div className="text-[13px] font-semibold text-texto-secundario">{titulo}</div>
        <div className="text-[15.5px] text-tinta leading-snug">{children}</div>
      </div>
    </div>
  );
}

export function Encuentranos() {
  const [verMapa, setVerMapa] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    vibrar();
    try {
      await navigator.clipboard.writeText(WHATSAPP_NUMBER.slice(2));
      setCopiado(true);
      avisar("Número copiado", "success");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      avisar(`No se pudo copiar. El número es ${WHATSAPP_VISIBLE}.`, "info");
    }
  };

  return (
    <section id="encuentranos" aria-labelledby="titulo-encuentranos" className="scroll-mt-4 mb-10">
      <div className="relative bg-white rounded-[28px] shadow-card border border-[#eee2cb] overflow-hidden">
        {/* La Mamá que acompaña al bajar termina parada sobre los botones de abajo (data-mama="final"). */}
        <div className="p-5 pb-4">
          <h2 id="titulo-encuentranos" data-mama="texto" className="font-display text-[1.75rem] text-tinta leading-tight mb-1 pr-[30%]">
            Encuéntranos
          </h2>
          <p className="text-[14.5px] text-texto-secundario mb-4 pr-[30%]">Pasa a recoger o pide tu delivery.</p>
          <div className="pr-[30%] mb-5">
            <EstadoLocal />
          </div>

          <div className="space-y-4">
            <Fila Icono={MapPin} titulo="Dirección">
              {DIRECCION.linea1}
              <br />
              <span className="text-texto-secundario">{DIRECCION.linea2}</span>
              <br />
              <span className="text-[14px] text-terracota-oscura font-semibold">{DIRECCION.referencia}</span>
            </Fila>
            <Fila Icono={Clock} titulo="Horario">
              {HORARIO.dias_texto}
              <br />
              {HORARIO.horas_texto}
              <br />
              <span className="text-texto-secundario">{HORARIO.cerrado}</span>
            </Fila>
            <Fila Icono={MessageCircle} titulo="WhatsApp">
              <span className="font-mono font-semibold">{WHATSAPP_VISIBLE}</span>
              <m.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={copiar}
                className="ml-2 inline-flex items-center gap-1 text-[13px] font-semibold text-terracota-oscura bg-terracota/10 rounded-full px-2.5 py-1 align-middle"
              >
                {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
              </m.button>
            </Fila>
          </div>
        </div>

        <div data-mama="final" className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-2">
          <m.a
            whileTap={{ scale: 0.96 }}
            href={MAPA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta flex items-center justify-center gap-2 rounded-2xl bg-terracota text-white font-semibold text-[15px] py-3.5"
          >
            <Navigation size={17} /> Cómo llegar
          </m.a>
          <m.a
            whileTap={{ scale: 0.96 }}
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta-salvia flex items-center justify-center gap-2 rounded-2xl bg-salvia text-white font-semibold text-[15px] py-3.5"
          >
            <MessageCircle size={17} /> Escríbenos
          </m.a>
        </div>

        <div className="border-t border-divisor">
          {verMapa ? (
            <iframe
              title="Mapa de Cocina de Mamá en La Molina"
              src={MAPA_EMBED_URL}
              className="w-full h-64 block"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                vibrar();
                setVerMapa(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-4 text-[14.5px] font-semibold text-texto-secundario hover:bg-crema transition-colors"
            >
              <MapIcon size={17} /> Ver el mapa
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[12.5px] text-texto-terciario mt-5">© {new Date().getFullYear()} Cocina de Mamá · La Molina, Lima</p>
    </section>
  );
}
