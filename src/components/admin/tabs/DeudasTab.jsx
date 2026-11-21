// src/components/admin/tabs/DeudasTab.jsx
// Quién debe, por semana (lunes a domingo). Cada semana se abre y muestra a
// sus clientes (cuánto deben esa semana y cuántos menús pidieron); cada
// cliente se abre y muestra sus pedidos día por día, para marcarlos pagados
// uno por uno o toda la semana de una vez.
import { useMemo, useState } from "react";
import { ChevronDown, Phone, CheckCircle2 } from "lucide-react";
import { EmptyState, ConfirmDialog } from "../../ui";
import { PAY_LABELS, MODO_LABELS, soles } from "../../../utils/pedidos";
import { resumenPedido } from "../../../lib/cuaderno";
import { deudasPorSemana, etiquetaDia, lunesDe } from "../../../lib/deudas";
import { todayKey } from "../../../data";

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export function DeudasTab({ deudaList, onOrderUpdate }) {
  const semanas = useMemo(() => deudasPorSemana(deudaList), [deudaList]);
  const esta = lunesDe(todayKey());
  const totalDeuda = semanas.reduce((a, s) => a + s.monto, 0);
  const [pagarSemana, setPagarSemana] = useState(null); // { nombre, etiqueta, pedidos }

  if (semanas.length === 0) {
    return (
      <div className="pb-10">
        <EmptyState text="Nadie debe nada registrado por ahora." />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-10">
      <div className="bg-gradient-to-b from-tinta-media to-tinta-oscura rounded-2xl px-4 py-3 flex items-center justify-between text-[13px]">
        <span className="text-[#cfc3ad]">
          <b className="text-crema">{plural(deudaList.length, "cliente", "clientes")}</b> deben en total
        </span>
        <span className="text-dorado text-lg font-semibold font-mono">{soles(totalDeuda)}</span>
      </div>

      {semanas.map((s) => (
        <details key={s.lunes} open={s.lunes === esta} className="group/semana bg-white rounded-2xl border border-[#eee2cb] shadow-card overflow-hidden">
          <summary className="list-none cursor-pointer select-none flex items-center gap-3 px-4 py-3.5">
            <ChevronDown size={18} className="shrink-0 text-texto-secundario transition group-open/semana:rotate-180" />
            <div className="flex-1 min-w-0">
              <div className="font-display text-[1.1rem] text-tinta leading-tight">
                {s.lunes === esta ? "Esta semana" : "Semana"} <span className="font-sans text-[14px] text-texto-secundario">· {s.etiqueta}</span>
              </div>
              <div className="text-[12.5px] text-texto-secundario">
                {plural(s.clientes.length, "cliente", "clientes")} · {plural(s.pedidos, "pedido", "pedidos")} · {plural(s.menus, "menú", "menús")}
              </div>
            </div>
            <span className="shrink-0 font-mono font-semibold text-terracota">{soles(s.monto)}</span>
          </summary>

          <ul className="border-t border-divisor divide-y divide-divisor">
            {s.clientes.map((c) => (
              <li key={c.clave}>
                <details className="group/cliente">
                  <summary className="list-none cursor-pointer select-none flex items-center gap-3 px-4 py-3">
                    <ChevronDown size={16} className="shrink-0 text-texto-terciario transition group-open/cliente:rotate-180" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-tinta truncate">{c.nombre}</div>
                      <div className="text-[12.5px] text-texto-secundario">
                        {plural(c.pedidos.length, "pedido", "pedidos")} · {plural(c.menus, "menú", "menús")}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[14.5px] font-semibold text-tinta">{soles(c.monto)}</span>
                  </summary>

                  <div className="px-4 pb-3 space-y-1.5">
                    {c.telefono && (
                      <div className="text-[12.5px] text-texto-secundario flex items-center gap-1 pl-7">
                        <Phone size={12} /> {c.telefono}
                      </div>
                    )}
                    {c.pedidos.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 bg-crema rounded-lg pl-3 pr-1 py-1.5 text-[13px]">
                        <div className="flex-1 min-w-0">
                          <div className="text-tinta">
                            <b className="font-semibold">{etiquetaDia(p.fecha)}</b> · {resumenPedido(p) || "Pedido"}
                          </div>
                          <div className="text-[12px] text-texto-secundario">
                            <span className="font-mono text-terracota font-semibold">{soles(p.total)}</span>
                            {" · "}
                            {MODO_LABELS[p.modo] || "Llevar"}
                            {p.pago && p.pago !== "fiado" ? ` · ${PAY_LABELS[p.pago]}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => onOrderUpdate(p.id, { pagado: true })}
                          className="shrink-0 text-salvia text-[13px] font-semibold px-2.5 py-2.5 rounded-lg hover:bg-salvia/10"
                        >
                          Pagó
                        </button>
                      </div>
                    ))}
                    {c.pedidos.length > 1 && (
                      <button
                        onClick={() => setPagarSemana({ nombre: c.nombre, etiqueta: s.etiqueta, monto: c.monto, pedidos: c.pedidos })}
                        className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-salvia/40 text-salvia-oscura text-[13.5px] font-semibold py-2.5"
                      >
                        <CheckCircle2 size={15} /> Pagó toda la semana ({soles(c.monto)})
                      </button>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </details>
      ))}

      <ConfirmDialog
        open={!!pagarSemana}
        title="¿Pagó toda la semana?"
        message={pagarSemana ? `Se marcarán como pagados los ${pagarSemana.pedidos.length} pedidos de ${pagarSemana.nombre} de la semana ${pagarSemana.etiqueta} (${soles(pagarSemana.monto)}).` : ""}
        confirmLabel="Sí, pagó"
        cancelLabel="Cancelar"
        onCancel={() => setPagarSemana(null)}
        onConfirm={() => {
          pagarSemana.pedidos.forEach((p) => onOrderUpdate(p.id, { pagado: true }));
          setPagarSemana(null);
        }}
      />
    </div>
  );
}
