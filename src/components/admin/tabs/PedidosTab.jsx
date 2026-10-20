// src/components/admin/tabs/PedidosTab.jsx
import React, { useEffect, useRef } from "react";
import { MessageCirclePlus, Camera } from "lucide-react";
import { EmptyState } from "../../ui";
import { OrderCard } from "../OrderCard";
import { soles } from "../../../utils/pedidos";

export function PedidosTab({ onNuevoPedido, onFotoCuaderno, todaysOrders, totalVendidoHoy, onOrderUpdate, onOrderDelete, resaltadoId }) {
  const yaScrolleo = useRef(false);
  useEffect(() => {
    if (!resaltadoId || yaScrolleo.current) return;
    const el = document.getElementById(`pedido-${resaltadoId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      yaScrolleo.current = true;
    }
  }, [resaltadoId, todaysOrders]);

  return (
    <div className="pb-10">
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button
          onClick={onNuevoPedido}
          className="btn-cta-salvia bg-salvia hover:bg-salvia-oscura text-white font-semibold rounded-xl py-3 px-2 text-[14px] flex items-center justify-center gap-1.5"
        >
          <MessageCirclePlus size={17} /> Pedido de WhatsApp
        </button>
        <button
          onClick={onFotoCuaderno}
          className="btn-cta bg-terracota hover:bg-terracota-oscura text-white font-semibold rounded-xl py-3 px-2 text-[14px] flex items-center justify-center gap-1.5"
        >
          <Camera size={17} /> Foto del cuaderno
        </button>
      </div>
      {todaysOrders.length > 0 && (
        <div className="bg-gradient-to-b from-tinta-media to-tinta-oscura rounded-2xl p-4 mb-4 flex items-center justify-between">
          <span className="text-[#cfc3ad] text-sm">Total vendido hoy</span>
          <span className="text-dorado text-xl font-semibold font-mono">{soles(totalVendidoHoy)}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {todaysOrders.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState text="Aún no hay pedidos hoy. Los de la página aparecen aquí al instante; los de WhatsApp o del cuaderno regístralos con los botones de arriba." />
          </div>
        )}
        {todaysOrders
          .slice()
          .reverse()
          .map((o) => (
            <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} resaltado={o.id === resaltadoId} />
          ))}
      </div>
    </div>
  );
}
