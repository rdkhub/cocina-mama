// src/components/client/MenuHero.jsx
// Portada animada: pared de azulejos, el letrero "Cocina de Mamá" cae y la
// pared tiembla con un poco de vapor; luego Mamá sube asomándose por detrás
// del letrero y saluda. Las animaciones de Mamá están en lib/mamaGuia.js.
import { Lock, MessageCircle, UtensilsCrossed } from "lucide-react";
import { fechaLabel } from "../../data";
import { WHATSAPP_URL } from "../../utils/contacto";
import { soles } from "../../utils/pedidos";
import { EstadoLocal } from "./EstadoLocal";

export function MenuHero({ menuHoy, onAdmin, avatar = "/mama/mama-saluda-chica.webp" }) {
  const dia = menuHoy.dia;
  const irAlMenu = (e) => {
    e.preventDefault();
    document.getElementById("paso-modo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <header id="portada" className="portada intro-temblor">
      {/* Barra de arriba: siempre por encima de todo, nada la tapa. */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-[max(0.9rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 bg-tinta-oscura/80 backdrop-blur rounded-full pl-1 pr-3 py-1">
          <img src="/icons/icon-192.png" alt="" className="w-8 h-8 rounded-full" />
          <span className="font-display text-crema text-[15px] leading-none">Cocina de Mamá</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#1f9d55] text-white text-[13px] font-bold px-3 py-2 rounded-full shadow-[0_3px_0_#14713c]"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <button
            onClick={onAdmin}
            aria-label="Panel de administración"
            title="Panel de administración"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-tinta-oscura/70 text-[#cfc3ad] hover:text-dorado"
          >
            <Lock size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pt-[clamp(2.5rem,9vh,5rem)] pb-12">
        <div id="letrero-caja" className="relative w-full max-w-[46rem]">
          {/* Mamá espera escondida detrás del letrero (sube a los 2.6 s). */}
          <div id="mama-spot" className="mama-spot mama-escondible" style={{ right: "2%", bottom: "48%", width: "clamp(62px, 16vw, 100px)" }} aria-hidden>
            <div id="mama-move" style={{ transformOrigin: "50% 100%" }}>
              <img id="mama-hero" src={avatar} alt="" width={220} height={355} fetchPriority="high" />
            </div>
          </div>
          <h1 className="letrero intro-letrero relative text-[clamp(4.1rem,21vw,8rem)]">
            <span className="chico">Cocina</span>
            <span className="grande">de Mamá</span>
          </h1>
        </div>

        <p className="eslogan intro-eslogan mt-6 text-[clamp(1.7rem,8vw,2.7rem)] leading-none">Almuerzos caseros</p>
        <span className="cinta intro-cinta mt-2 inline-block rounded-xl px-4 py-1.5 text-[clamp(1.15rem,5vw,1.6rem)] leading-tight">hechos por Mamá</span>

        <div className="intro-botones mt-7 flex flex-col items-center gap-3.5 w-full">
          <div className="flex flex-wrap justify-center gap-3">
            <a
              id="btn-ver-menu"
              data-mama="arriba"
              href="#paso-modo"
              onClick={irAlMenu}
              className="btn-cta inline-flex items-center gap-2 bg-terracota text-white font-bold text-[16.5px] rounded-full px-6 py-3.5"
            >
              <UtensilsCrossed size={18} /> Ver el menú de hoy
            </a>
          </div>
          <div className="bg-tinta-oscura/85 backdrop-blur rounded-2xl px-4 py-3 text-crema max-w-[22rem] w-full">
            {dia && (
              <div className="flex items-baseline justify-center gap-4 mb-1.5">
                <span className="text-[13px] text-[#cfc3ad]">
                  Menú <b className="font-display text-[1.35rem] text-white font-normal">{soles(dia.precioRecojo)}</b>
                </span>
                <span className="text-[13px] text-[#cfc3ad]">
                  Delivery <b className="font-display text-[1.35rem] text-dorado font-normal">{soles(dia.precioDelivery)}</b>
                </span>
              </div>
            )}
            <div className="text-[12.5px] text-[#cfc3ad] mb-2">
              {fechaLabel(menuHoy.fecha)}
              {dia ? ` · Entrada + segundo + ${dia.refresco ? dia.refresco.trim().toLowerCase() : "refresco"}` : ""}
            </div>
            <EstadoLocal claro />
          </div>
        </div>
      </div>
    </header>
  );
}
