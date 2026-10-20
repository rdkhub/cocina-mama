// src/components/admin/OrderCard.jsx
import React, { useState } from "react";
import { Phone, Clock, Trash2, CheckCircle2, Circle, Wallet } from "lucide-react";
import { Tag, ConfirmDialog } from "../ui";
import { PAY_LABELS, PAY_COLORS, soles } from "../../utils/pedidos";

export function OrderCard({ order, onUpdate, onDelete, resaltado }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Las entradas guardadas en el pedido incluyen TANTO las que vinieron incluidas
  // gratis con un fondo COMO las extra pagadas aparte. Como cada línea de fondo ya
  // muestra su entrada incluida (ej. "Lomo saltado + Ensalada de palta"), aquí solo
  // mostramos las entradas EXTRA (las que sobran después de restar las incluidas),
  // para no repetir la misma entrada dos veces en la tarjeta.
  const incluidasPorNombre = {};
  (order.fondos || []).forEach((f) => {
    if (f.entradaIncluida) incluidasPorNombre[f.entradaIncluida] = (incluidasPorNombre[f.entradaIncluida] || 0) + (f.cantidad || 0);
  });
  const entradasExtra = (order.entradas || [])
    .map((e) => {
      const extra = e.cantidad - (incluidasPorNombre[e.nombre] || 0);
      return extra > 0 ? { ...e, cantidad: extra } : null;
    })
    .filter(Boolean);

  return (
    <div
      id={`pedido-${order.id}`}
      className={`bg-white rounded-2xl border shadow-card p-4 scroll-mt-4 transition ${
        resaltado ? "border-terracota ring-2 ring-terracota/30 animate-brilla" : "border-[#eee2cb]"
      }`}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="font-medium text-tinta flex items-center gap-1.5">
            {order.nombre}
            {order.origen === "whatsapp" && (
              <span className="text-[10px] uppercase font-semibold text-salvia border border-salvia/40 rounded-full px-1.5 py-0.5">WhatsApp</span>
            )}
            {order.origen === "manual" && (
              <span className="text-[10px] uppercase font-semibold text-ocre border border-ocre/40 rounded-full px-1.5 py-0.5">A mano</span>
            )}
            {order.nombre.toLowerCase().includes("prueba") && (
              <span className="text-[10px] uppercase font-normal text-ocre border border-ocre/40 rounded-full px-1.5 py-0.5">
                Prueba
              </span>
            )}
          </div>
          <div className="text-[13px] text-texto-secundario flex items-center gap-1">
            {order.telefono && (
              <>
                <Phone size={12} /> {order.telefono}
              </>
            )}
            <Clock size={12} className="ml-1.5" />{" "}
            {new Date(order.creadoEn).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-terracota font-semibold font-mono text-[15px]">{soles(order.total)}</div>
          <button onClick={() => setConfirmOpen(true)} aria-label="Borrar este pedido" className="text-arena-hover hover:text-terracota p-1">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="text-[14px] text-[#3a332b] space-y-0.5 mb-3">
        {order.fondos.map((f, i) => (
          <div key={"f" + i}>
            {f.nombre}
            {f.proteina && <span className="text-ocre"> — {f.proteina}</span>}
            {f.entradaIncluida && <span className="text-salvia"> + {f.entradaIncluida}</span>}
            {f.arroz && <span className="text-ocre"> ({f.arroz === "con" ? "con arroz" : "sin arroz"})</span>}{" "}
            {f.cantidad > 1 && <span className="text-terracota font-semibold">x{f.cantidad}</span>}
          </div>
        ))}
        {entradasExtra.map((e, i) => (
          <div key={"e" + i} className="text-texto-secundario">
            + {e.nombre} <span className="text-[10px] uppercase text-ocre">(extra)</span> {e.cantidad > 1 && <span className="text-terracota font-semibold">x{e.cantidad}</span>}
          </div>
        ))}
        {(order.adicionales || []).map((a, i) => (
          <div key={"a" + i} className="text-texto-secundario">
            + {a.nombre} {a.cantidad > 1 && <span className="text-terracota font-semibold">x{a.cantidad}</span>}
          </div>
        ))}
        {order.notas && <div className="text-ocre italic">"{order.notas}"</div>}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Tag color={order.modo === "delivery" ? "#9C7A3C" : "#5C7A4F"}>
          {order.modo === "delivery" ? `Delivery: ${order.direccion}` : "Recojo en local"}
        </Tag>
        <Tag color={PAY_COLORS[order.pago]}>{PAY_LABELS[order.pago]}</Tag>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-divisor">
        <button
          onClick={() => onUpdate(order.id, { listo: !order.listo })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.listo ? "text-salvia" : "text-texto-secundario"}`}
        >
          {order.listo ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          {order.listo ? "Listo" : "Marcar listo"}
        </button>
        <button
          onClick={() => onUpdate(order.id, { pagado: !order.pagado })}
          className={`text-[13px] font-medium flex items-center gap-1.5 ${order.pagado ? "text-salvia" : "text-terracota"}`}
        >
          <Wallet size={15} />
          {order.pagado ? "Pagado" : "Debe — marcar pagado"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Borrar este pedido?"
        message={`Se eliminará el pedido de ${order.nombre} de forma permanente. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, borrar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete(order.id);
        }}
      />
    </div>
  );
}
