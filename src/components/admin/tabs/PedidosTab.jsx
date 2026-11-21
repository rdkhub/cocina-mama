// src/components/admin/tabs/PedidosTab.jsx
import { useEffect, useRef } from "react";
import { MessageCirclePlus } from "lucide-react";
import { EmptyState } from "../../ui";
import { OrderCard } from "../OrderCard";
import { ResumenCocina } from "../ResumenCocina";
import { soles } from "../../../utils/pedidos";

export function PedidosTab({ onNuevoPedido, todaysOrders, totalVendidoHoy, onOrderUpdate, onOrderDelete, resaltadoId, onCorregir }) {
  // Arriba los que faltan (el más nuevo primero); los listos bajan al final.
  const recientes = todaysOrders.slice().reverse();
  const faltan = recientes.filter((o) => !o.listo);
  const listos = recientes.filter((o) => o.listo);
  const tarjeta = (o) => <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} onCorregir={onCorregir} resaltado={o.id === resaltadoId} />;
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
      <h2 className="font-display text-[1.2rem] text-tinta mb-2.5">
        Pedidos {todaysOrders.length > 0 && <span className="font-sans text-[14px] text-texto-secundario">· faltan {faltan.length}</span>}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {todaysOrders.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState text="Aún no hay pedidos hoy. Los de la página aparecen aquí al instante; los de WhatsApp regístralos con el botón de arriba." />
          </div>
        )}
        {todaysOrders.length > 0 && faltan.length === 0 && (
          <div className="sm:col-span-2 text-center text-[14px] text-salvia-oscura bg-salvia/10 rounded-xl py-3">Todos los pedidos están listos.</div>
        )}
        {faltan.map(tarjeta)}
      </div>
      {listos.length > 0 && (
        <>
          <h3 className="font-display text-[1.05rem] text-texto-secundario mt-6 mb-2.5">Listos ({listos.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-80">{listos.map(tarjeta)}</div>
        </>
      )}
    </div>
  );
}
