// src/components/client/MenuHero.jsx
// Portada: Mamá saluda con su olla detrás del "mostrador" de precios.
import { m } from "motion/react";
import { Lock, MessageCircle } from "lucide-react";
import { fechaLabel } from "../../data";
import { WHATSAPP_URL } from "../../utils/contacto";
import { soles } from "../../utils/pedidos";
import { EstadoLocal } from "./EstadoLocal";

export function MenuHero({ menuHoy, onAdmin, avatar = "/mama/mama-saluda.webp" }) {
  const dia = menuHoy.dia;
  return (
    <header className="relative bg-gradient-to-b from-tinta-media to-tinta-oscura text-crema px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-7 overflow-hidden">
      <div className="absolute -top-16 -right-20 w-72 h-72 rounded-full opacity-[0.22] blur-3xl pointer-events-none bg-terracota" />
      <div className="absolute top-40 -left-24 w-60 h-60 rounded-full opacity-[0.12] blur-3xl pointer-events-none bg-dorado" />
      <div className="relative max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
            <span className="font-display text-[1.15rem] leading-none">Cocina de Mamá</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 text-[#7BEA9F] text-[13px] font-semibold px-3 py-1.5 rounded-full"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <button
              onClick={onAdmin}
              aria-label="Panel de administración"
              title="Panel de administración"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#a89b8a] hover:text-dorado hover:bg-white/5"
            >
              <Lock size={15} />
            </button>
          </div>
        </div>

        {/* Título a la izquierda, Mamá a la derecha; sus piernas quedan detrás del mostrador de precios. */}
        <div className="relative flex items-end min-h-[13.5rem]">
          <div className="relative z-10 w-[58%] pb-5">
            <h1 className="font-display text-[2.15rem] leading-[1.05] mb-2.5">¿Qué vas a almorzar hoy?</h1>
            <p className="text-[14.5px] text-[#e6dccb] leading-snug mb-3">
              Comida casera, hecha por Mamá. <span className="text-[#cfc3ad]">{fechaLabel(menuHoy.fecha)}.</span>
            </p>
            <EstadoLocal claro />
          </div>
          <m.img
            src={avatar}
            alt="Mamá, la cocinera, saludando con una olla de comida casera"
            width={558}
            height={900}
            fetchPriority="high"
            initial={{ y: 40, opacity: 0, rotate: 3 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.1 }}
            className="absolute right-[-1.25rem] bottom-[-5.5rem] w-[52%] max-w-[230px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] pointer-events-none select-none"
          />
        </div>

        {dia && (
          <div className="relative z-10 flex items-stretch gap-2">
            <div className="flex-1 rounded-2xl bg-[#2a221b] border border-white/10 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.5)] px-3.5 py-2.5">
              <div className="text-[12px] text-[#cfc3ad] font-semibold">Menú completo</div>
              <div className="font-display text-[1.65rem] text-white leading-tight">{soles(dia.precioRecojo)}</div>
              <div className="text-[12.5px] text-[#cfc3ad]">
                Entrada + segundo{dia.refresco ? ` + ${dia.refresco.trim().toLowerCase()}` : " + refresco"}
              </div>
            </div>
            <div className="rounded-2xl bg-[#2a221b] border border-white/10 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.5)] px-3.5 py-2.5 text-right">
              <div className="text-[12px] text-[#cfc3ad] font-semibold">Delivery</div>
              <div className="font-display text-[1.65rem] text-dorado leading-tight">{soles(dia.precioDelivery)}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
