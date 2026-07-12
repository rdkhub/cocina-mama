// src/components/admin/tabs/SemanalTab.jsx
import React from "react";

export function SemanalTab({ resumenSemanal, todayKey }) {
  return (
    <div className="pb-10">
      <p className="text-[#6E6253] text-[13px] mb-4">
        Resumen de los últimos 7 días &middot; útil para revisar cada sábado cómo fue la semana.
      </p>

      {/* Totales generales */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gradient-to-b from-[#332A21] to-[#211B16] rounded-2xl p-4">
          <div className="text-[#cfc3ad] text-[12px] mb-1">Vendido esta semana</div>
          <div className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            S/ {resumenSemanal.totalSemana.toFixed(2)}
          </div>
          <div className="text-[#9c9082] text-[11px] mt-1">{resumenSemanal.totalPedidos} pedidos</div>
        </div>
        <div className="bg-white border border-[#eee2cb] rounded-2xl shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4">
          <div className="text-[#6E6253] text-[12px] mb-1">Deuda acumulada</div>
          <div className="text-[#C1452D] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            S/ {resumenSemanal.totalDeudaSemana.toFixed(2)}
          </div>
          <div className="text-[#998C76] text-[11px] mt-1">de esta semana</div>
        </div>
      </div>

      {/* Detalle de quién debe esta semana */}
      {resumenSemanal.listaDeudores.length > 0 && (
        <div className="bg-white border border-[#eee2cb] rounded-2xl shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4 mb-5">
          <div className="text-[#2B2622] text-[14px] font-medium mb-3">Quién debe esta semana</div>
          <div className="space-y-2">
            {resumenSemanal.listaDeudores.map((d) => (
              <div key={d.nombre + d.telefono} className="flex items-center justify-between bg-[#FBF6EC] rounded-lg px-3 py-2">
                <div>
                  <div className="text-[13px] text-[#2B2622] font-medium">{d.nombre}</div>
                  <div className="text-[11px] text-[#998C76]">
                    {d.telefono} &middot; {d.pedidos} pedido{d.pedidos > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-[#C1452D] font-semibold text-[14px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  S/ {d.monto.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico de barras: ventas por día */}
      <div className="bg-white border border-[#eee2cb] rounded-2xl shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4 mb-5">
        <div className="text-[#2B2622] text-[14px] font-medium mb-4">Ventas por día</div>
        <div className="flex items-end justify-between gap-2 h-36">
          {resumenSemanal.dias.map((d) => {
            const alturaPct = Math.max(4, (d.total / resumenSemanal.maxDia) * 100);
            const esHoy = d.fecha === todayKey();
            return (
              <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[11px] text-[#6E6253]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {d.total > 0 ? d.total.toFixed(0) : ""}
                </span>
                <div
                  className={`w-full rounded-md transition-all ${esHoy ? "bg-[#C1452D]" : "bg-[#E0A95C]"}`}
                  style={{ height: `${alturaPct}%`, minHeight: "4px" }}
                  title={`${d.etiqueta}: S/ ${d.total.toFixed(2)}`}
                />
                <span className={`text-[11px] ${esHoy ? "text-[#C1452D] font-semibold" : "text-[#6E6253]"}`}>{d.etiqueta}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platos más pedidos */}
      <div className="bg-white border border-[#eee2cb] rounded-2xl shadow-[0_2px_10px_rgba(43,38,34,0.05)] p-4">
        <div className="text-[#2B2622] text-[14px] font-medium mb-3">Platos más pedidos</div>
        {resumenSemanal.platosTop.length === 0 && (
          <p className="text-[#998C76] text-[13px]">Todavía no hay pedidos esta semana.</p>
        )}
        <div className="space-y-2.5">
          {resumenSemanal.platosTop.map((p, idx) => {
            const maxCant = resumenSemanal.platosTop[0]?.cantidad || 1;
            const anchoPct = Math.max(8, (p.cantidad / maxCant) * 100);
            return (
              <div key={p.nombre}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[#3a332b]">
                    {idx + 1}. {p.nombre}
                  </span>
                  <span className="text-[#9C7A3C] font-medium">x{p.cantidad}</span>
                </div>
                <div className="h-1.5 bg-[#FBF6EC] rounded-full overflow-hidden">
                  <div className="h-full bg-[#5C7A4F] rounded-full" style={{ width: `${anchoPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
