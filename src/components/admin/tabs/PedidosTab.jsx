// src/components/admin/tabs/PedidosTab.jsx
import { useEffect, useRef } from "react";
import { MessageCirclePlus } from "lucide-react";
import { EmptyState } from "../../ui";
import { OrderCard } from "../OrderCard";
import { ResumenCocina } from "../ResumenCocina";
import { soles } from "../../../utils/pedidos";

export function PedidosTab({ onNuevoPedido, todaysOrders, totalVendidoHoy, onOrderUpdate, onOrderDelete, resaltadoId }) {
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
      <button
        onClick={onNuevoPedido}
        className="btn-cta-salvia w-full mb-4 bg-salvia hover:bg-salvia-oscura text-white font-semibold rounded-xl py-3 text-[14.5px] flex items-center justify-center gap-2"
      >
        <MessageCirclePlus size={18} /> Registrar pedido de WhatsApp
      </button>
      {todaysOrders.length > 0 && (
        <div className="bg-gradient-to-b from-tinta-media to-tinta-oscura rounded-2xl p-4 mb-4 flex items-center justify-between">
          <span className="text-[#cfc3ad] text-sm">Total vendido hoy</span>
          <span className="text-dorado text-xl font-semibold font-mono">{soles(totalVendidoHoy)}</span>
        </div>
      )}
      <ResumenCocina orders={todaysOrders} />
      <h2 className="font-display text-[1.2rem] text-tinta mb-2.5">Pedidos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {todaysOrders.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState text="Aún no hay pedidos hoy. Los de la página aparecen aquí al instante; los de WhatsApp regístralos con el botón de arriba." />
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
