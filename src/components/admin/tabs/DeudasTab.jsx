// src/components/admin/tabs/DeudasTab.jsx
import React from "react";
import { Phone } from "lucide-react";
import { Tag, EmptyState } from "../../ui";
import { calcularTotal, PAY_LABELS } from "../../../utils/pedidos";

export function DeudasTab({ deudaList, onOrderUpdate }) {
  return (
    <div className="space-y-3 pb-10">
      {deudaList.length === 0 && <EmptyState text="Nadie debe nada registrado por ahora." />}
      {deudaList.map((d) => (
        <div key={d.nombre + d.telefono} className="bg-white rounded-2xl border border-[#eee2cb] shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="font-medium text-[#2B2622]">{d.nombre}</div>
              <div className="text-[13px] text-[#6E6253] flex items-center gap-1">
                <Phone size={12} /> {d.telefono}
              </div>
            </div>
            <div className="text-right">
              <Tag color="#C1452D">S/ {d.monto.toFixed(2)}</Tag>
              <div className="text-[11px] text-[#998C76] mt-1">{d.cantidad} pedido{d.cantidad > 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {d.pedidos.map((p) => {
              const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
              const montoPedido = typeof p.total === "number" ? p.total : calcularTotal(p.fondos, p.entradas, p.modo, p.adicionales);
              return (
                <div key={p.id} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2 text-[13px]">
                  <span className="text-[#5c5246]">
                    {p.fecha} &middot; {resumen.length > 28 ? resumen.slice(0, 28) + "…" : resumen}
                    <span className="text-[#C1452D] font-medium"> &middot; S/ {montoPedido.toFixed(2)}</span>
                    <span className="text-[#998C76]"> &middot; {PAY_LABELS[p.pago]}</span>
                  </span>
                  <button
                    onClick={() => onOrderUpdate(p.id, { pagado: true })}
                    className="text-[#5C7A4F] font-medium hover:underline whitespace-nowrap ml-2"
                  >
                    Marcar pagado
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
