// src/components/admin/tabs/DeudasTab.jsx
import React from "react";
import { Phone } from "lucide-react";
import { Tag, EmptyState } from "../../ui";
import { PAY_LABELS, soles } from "../../../utils/pedidos";

export function DeudasTab({ deudaList, onOrderUpdate }) {
  return (
    <div className="space-y-3 pb-10">
      {deudaList.length === 0 && <EmptyState text="Nadie debe nada registrado por ahora." />}
      {deudaList.map((d) => (
        <div key={d.nombre + d.telefono} className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="font-medium text-tinta">{d.nombre}</div>
              <div className="text-[13px] text-texto-secundario flex items-center gap-1">
                <Phone size={12} /> {d.telefono}
              </div>
            </div>
            <div className="text-right">
              <Tag color="#C1452D">{soles(d.monto)}</Tag>
              <div className="text-[11px] text-texto-terciario mt-1">{d.cantidad} pedido{d.cantidad > 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            {d.pedidos.map((p) => {
              const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
              return (
                <div key={p.id} className="flex items-center justify-between bg-crema rounded-lg px-3 py-2 text-[13px]">
                  <span className="text-[#5c5246]">
                    {p.fecha} · {resumen.length > 28 ? resumen.slice(0, 28) + "…" : resumen}
                    <span className="text-terracota font-medium"> · {soles(p.total)}</span>
                    <span className="text-texto-terciario"> · {PAY_LABELS[p.pago]}</span>
                  </span>
                  <button onClick={() => onOrderUpdate(p.id, { pagado: true })} className="text-salvia font-medium hover:underline whitespace-nowrap ml-2">
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
