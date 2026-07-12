// src/components/admin/tabs/PedidosTab.jsx
import React from "react";
import { EmptyState } from "../../ui";
import { OrderCard } from "../OrderCard";

export function PedidosTab({ todaysOrders, totalVendidoHoy, onOrderUpdate, onOrderDelete }) {
  return (
    <div className="pb-10">
      {todaysOrders.length > 0 && (
        <div className="bg-gradient-to-b from-[#332A21] to-[#211B16] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <span className="text-[#cfc3ad] text-sm">Total vendido hoy</span>
          <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            S/ {totalVendidoHoy.toFixed(2)}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {todaysOrders.length === 0 && (
          <div className="sm:col-span-2">
            <EmptyState text="Aún no han llegado pedidos hoy. En cuanto alguien pida desde la página, aparece aquí al instante." />
          </div>
        )}
        {todaysOrders
          .slice()
          .reverse()
          .map((o) => (
            <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} />
          ))}
      </div>
    </div>
  );
}
