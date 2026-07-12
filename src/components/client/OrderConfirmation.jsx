// src/components/client/OrderConfirmation.jsx
import React from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Row } from "../ui";
import { PAY_LABELS } from "../../utils/pedidos";

export function OrderConfirmation({ menu, justSubmitted, onReset }) {
  return (
    <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center px-5">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#5C7A4F]/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={32} color="#5C7A4F" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-2xl text-[#2B2622] mb-2">Pedido recibido</h2>
        <p className="text-[#6b5f52] text-[15px] leading-relaxed mb-7">
          Tu pedido ya está en la cocina. Te avisamos por WhatsApp cuando esté listo
          {justSubmitted.modo === "delivery" ? " para salir." : " para recoger."}
        </p>
        <div className="text-left bg-white rounded-2xl border border-[#e8ddc8] p-4 mb-7 text-sm">
          {justSubmitted.fondos.map((f, i) => {
            const detalles = [
              f.proteina,
              f.entradaIncluida ? `con ${f.entradaIncluida}` : null,
              f.arroz === "con" ? "con arroz" : f.arroz === "sin" ? "sin arroz" : null,
            ].filter(Boolean);
            return (
              <Row
                key={"f" + i}
                label={f.cantidad > 1 ? `Plato (x${f.cantidad})` : "Plato"}
                value={detalles.length > 0 ? `${f.nombre} — ${detalles.join(", ")}` : f.nombre}
              />
            );
          })}
          {(() => {
            const incluidasPorNombre = {};
            justSubmitted.fondos.forEach((f) => {
              if (f.entradaIncluida) incluidasPorNombre[f.entradaIncluida] = (incluidasPorNombre[f.entradaIncluida] || 0) + f.cantidad;
            });
            return justSubmitted.entradas
              .map((e) => {
                const extra = e.cantidad - (incluidasPorNombre[e.nombre] || 0);
                return extra > 0 ? { ...e, cantidad: extra } : null;
              })
              .filter(Boolean)
              .map((e, i) => (
                <Row key={"ex" + i} label={e.cantidad > 1 ? `Entrada adicional (x${e.cantidad})` : "Entrada adicional"} value={e.nombre} />
              ));
          })()}
          {(justSubmitted.adicionales || []).map((a, i) => (
            <Row key={"a" + i} label={a.cantidad > 1 ? `Adicional (x${a.cantidad})` : "Adicional"} value={a.nombre} />
          ))}
          <Row label="Refresco" value={`${menu.bebida} (incluido)`} />
          <Row label="Pago" value={PAY_LABELS[justSubmitted.pago]} />
          <Row label="Total a pagar" value={`S/ ${justSubmitted.total.toFixed(2)}`} />
        </div>

        {justSubmitted.pago === "yape" && (
          <div className="bg-[#5C7A4F]/10 border border-[#5C7A4F]/30 rounded-2xl p-4 mb-7 text-left flex items-start gap-2.5">
            <Wallet size={18} color="#5C7A4F" className="shrink-0 mt-0.5" />
            <p className="text-[#3a4a32] text-[14px] leading-relaxed">
              No olvides mandar tu captura del Yape por WhatsApp para confirmar tu pago.
            </p>
          </div>
        )}

        <button
          onClick={onReset}
          className="text-[#C1452D] text-sm font-medium underline-offset-4 hover:underline"
        >
          Hacer otro pedido
        </button>
      </div>
    </div>
  );
}
