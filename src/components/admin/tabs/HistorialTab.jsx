// src/components/admin/tabs/HistorialTab.jsx
import React from "react";
import { Phone } from "lucide-react";
import { Field, SelectCard, EmptyState, inputStyle } from "../../ui";
import { OrderCard } from "../OrderCard";
import { calcularTotal } from "../../../utils/pedidos";

export function HistorialTab({
  modoHistorial,
  setModoHistorial,
  fechaHistorial,
  setFechaHistorial,
  fechasConPedidos,
  ordersDelDia,
  totalDelDia,
  busquedaCliente,
  setBusquedaCliente,
  clientesEncontrados,
  onOrderUpdate,
  onOrderDelete,
  todayKey,
  todayLabel,
}) {
  return (
    <div className="pb-10">
      <div className="grid grid-cols-2 gap-2 mb-4">
        <SelectCard
          active={modoHistorial === "fecha"}
          onClick={() => setModoHistorial("fecha")}
          text="Buscar por fecha"
          compact
        />
        <SelectCard
          active={modoHistorial === "cliente"}
          onClick={() => setModoHistorial("cliente")}
          text="Buscar por cliente"
          compact
        />
      </div>

      {modoHistorial === "fecha" && (
        <>
          <Field label="Ver pedidos del día">
            <select
              className={inputStyle}
              value={fechaHistorial}
              onChange={(e) => setFechaHistorial(e.target.value)}
            >
              {fechasConPedidos.length === 0 && <option value={todayKey()}>Hoy &middot; {todayLabel()}</option>}
              {fechasConPedidos.map((f) => (
                <option key={f} value={f}>
                  {f === todayKey() ? `Hoy · ${f}` : f}
                </option>
              ))}
            </select>
          </Field>

          {ordersDelDia.length > 0 && (
            <div className="bg-gradient-to-b from-[#332A21] to-[#211B16] rounded-2xl p-4 my-4 flex items-center justify-between">
              <span className="text-[#cfc3ad] text-sm">
                Total vendido &middot; {ordersDelDia.length} pedido{ordersDelDia.length > 1 ? "s" : ""}
              </span>
              <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                S/ {totalDelDia.toFixed(2)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {ordersDelDia.length === 0 && (
              <div className="sm:col-span-2">
                <EmptyState text="No hay pedidos registrados en esa fecha." />
              </div>
            )}
            {ordersDelDia
              .slice()
              .reverse()
              .map((o) => (
                <OrderCard key={o.id} order={o} onUpdate={onOrderUpdate} onDelete={onOrderDelete} />
              ))}
          </div>
        </>
      )}

      {modoHistorial === "cliente" && (
        <>
          <Field label="Buscar por nombre o teléfono">
            <input
              className={inputStyle}
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              placeholder="Ej: María, o 999..."
            />
          </Field>

          {busquedaCliente.trim() === "" && (
            <div className="mt-4">
              <EmptyState text="Escribe un nombre o número de teléfono para ver el historial completo de ese cliente, en todas las fechas." />
            </div>
          )}

          {busquedaCliente.trim() !== "" && clientesEncontrados.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No se encontró ningún cliente con ese nombre o teléfono." />
            </div>
          )}

          <div className="space-y-4 mt-4">
            {clientesEncontrados.map((c) => (
              <div key={c.nombre + c.telefono} className="bg-white rounded-2xl border border-[#eee2cb] shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium text-[#2B2622]">{c.nombre}</div>
                    <div className="text-[13px] text-[#6E6253] flex items-center gap-1">
                      <Phone size={12} /> {c.telefono}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#2B2622] font-semibold text-[15px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      S/ {c.totalGastado.toFixed(2)} <span className="text-[11px] text-[#998C76] font-normal">en total</span>
                    </div>
                    {c.totalDebe > 0 && (
                      <div className="text-[#C1452D] text-[12px] font-medium mt-0.5">Debe S/ {c.totalDebe.toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {c.pedidos
                    .slice()
                    .sort((a, b) => b.fecha.localeCompare(a.fecha))
                    .map((p) => {
                      const resumen = p.fondos.map((f) => (f.cantidad > 1 ? `${f.nombre} x${f.cantidad}` : f.nombre)).join(", ");
                      const montoPedido = typeof p.total === "number" ? p.total : calcularTotal(p.fondos, p.entradas, p.modo, p.adicionales);
                      const pendiente = !p.pagado;
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2 text-[13px]">
                          <span className="text-[#5c5246]">
                            {p.fecha} &middot; {resumen.length > 24 ? resumen.slice(0, 24) + "…" : resumen}
                            <span className="text-[#9C7A3C] font-medium"> &middot; S/ {montoPedido.toFixed(2)}</span>
                          </span>
                          {pendiente ? (
                            <span className="text-[#C1452D] font-medium whitespace-nowrap ml-2">Debe</span>
                          ) : (
                            <span className="text-[#5C7A4F] font-medium whitespace-nowrap ml-2">Pagado</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
