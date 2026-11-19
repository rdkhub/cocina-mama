// src/components/client/MenuHero.jsx
import { Lock, MessageCircle } from "lucide-react";
import { fechaLabel } from "../../data";
import { WHATSAPP_URL } from "../../utils/contacto";
import { soles } from "../../utils/pedidos";

export function MenuHero({ menuHoy, onAdmin }) {
  const dia = menuHoy.dia;
  return (
    <header className="relative bg-gradient-to-b from-tinta-media to-tinta-oscura text-crema px-5 pt-[max(1.75rem,env(safe-area-inset-top))] pb-16 overflow-hidden">
      <div className="absolute -top-12 -right-16 w-64 h-64 rounded-full opacity-[0.2] blur-3xl pointer-events-none bg-terracota" />
      <div className="relative max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-xl" />
            <span className="font-display text-lg tracking-wide">Cocina de Mamá</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 text-[#5CE08A] text-[12px] font-medium px-2.5 py-1.5 rounded-full"
            >
              <MessageCircle size={13} />
              WhatsApp
            </a>
            <button
              onClick={onAdmin}
              aria-label="Panel de administración"
              title="Panel de administración"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#9c9082] hover:text-dorado hover:bg-white/5"
            >
              <Lock size={14} />
            </button>
          </div>
        </div>

        <div className="font-mono text-[0.72rem] tracking-[0.08em] text-dorado uppercase mb-1.5">
          Menú de hoy · {fechaLabel(menuHoy.fecha)}
        </div>
        <h1 className="font-display text-[1.9rem] leading-[1.12] mb-3">¿Qué vas a almorzar hoy?</h1>

        {dia && (
          <div className="flex items-stretch gap-2">
            <div className="flex-1 rounded-2xl bg-white/[0.07] border border-white/10 px-3.5 py-2.5">
              <div className="text-[11px] text-[#cfc3ad] uppercase tracking-wide">Menú completo</div>
              <div className="font-display text-2xl text-white leading-tight">{soles(dia.precioRecojo)}</div>
              <div className="text-[12px] text-[#cfc3ad]">
                Entrada + segundo{dia.refresco ? ` + ${dia.refresco.trim().toLowerCase()}` : " + refresco"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-3.5 py-2.5 text-right">
              <div className="text-[11px] text-[#cfc3ad] uppercase tracking-wide">Delivery</div>
              <div className="font-display text-2xl text-dorado leading-tight">{soles(dia.precioDelivery)}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
