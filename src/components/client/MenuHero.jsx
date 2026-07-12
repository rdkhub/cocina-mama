// src/components/client/MenuHero.jsx
import React from "react";
import { ChefHat, MessageCircle } from "lucide-react";
import { todayLabel } from "../../data";
import { WHATSAPP_URL } from "../../utils/contacto";

export function MenuHero({ menu }) {
  return (
    <div className="relative bg-gradient-to-b from-[#332A21] to-[#211B16] text-[#FBF6EC] px-5 pt-9 pb-14 overflow-hidden">
      {/* Resplandor cálido sutil, como una luz de cocina, para que el negro no se vea plano */}
      <div
        className="absolute -top-10 -right-16 w-56 h-56 rounded-full opacity-[0.18] blur-3xl pointer-events-none"
        style={{ backgroundColor: "#C1452D" }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #fff 0%, transparent 1%), radial-gradient(circle at 80% 60%, #fff 0%, transparent 1%)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative max-w-md mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ChefHat size={20} strokeWidth={1.75} color="#E0A95C" />
            <span className="font-display text-lg tracking-wide">Cocina de Mamá</span>
          </div>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/40 text-[#5CE08A] text-[12px] font-medium px-2.5 py-1.5 rounded-full hover:bg-[#25D366]/25 transition"
          >
            <MessageCircle size={13} />
            WhatsApp
          </a>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.06em",
          }}
          className="text-[#E0A95C] uppercase mb-1"
        >
          Menú de hoy &middot; {todayLabel()}
        </div>
        <h1 className="font-display text-[2rem] leading-[1.1] mb-1">{menu.fondos[0]?.nombre}</h1>
        {menu.fondos.length > 1 && (
          <p className="text-[#cfc3ad] text-[15px] mb-2">
            o {menu.fondos.slice(1).map((f) => f.nombre).join(" · o ")}
          </p>
        )}
        <p className="text-[#E0A95C] text-[14px]">+ Refresco: {menu.bebida}</p>
      </div>
    </div>
  );
}
