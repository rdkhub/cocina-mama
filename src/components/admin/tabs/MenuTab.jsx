// src/components/admin/tabs/MenuTab.jsx
// "Armar menú de hoy": tocar platos del catálogo (agrupados por categoría),
// marcar proteínas y agotados, fijar precios, copiar el menú de otro día.
import React, { useState, useMemo } from "react";
import { Check, Ban, Copy, Loader2, ChevronDown } from "lucide-react";
import { FotoPlato, Field, inputStyle, EmptyState } from "../../ui";
import { CATEGORIAS } from "../../../lib/catalogo";
import { soles } from "../../../utils/pedidos";

function FilaPlato({ plato, enMenu, onToggle, item, proteinas, onToggleProteina, onToggleAgotado, onPrecioExtra }) {
  const agotado = item?.agotado;
  return (
    <div className={`rounded-xl border-2 transition ${enMenu ? "border-terracota bg-white" : "border-transparent bg-white"} shadow-card`}>
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 p-2.5 text-left">
        <FotoPlato plato={plato} className="w-12 h-12 shrink-0" iconSize={20} />
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] leading-snug ${enMenu ? "font-semibold text-tinta" : "font-medium text-[#3a332b]"}`}>{plato.nombre}</div>
          {!plato.activo && <div className="text-[11px] text-texto-terciario">Plato desactivado</div>}
        </div>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${enMenu ? "bg-terracota border-terracota text-white" : "border-arena-oscura text-transparent"}`}>
          <Check size={15} strokeWidth={3} />
        </span>
      </button>

      {enMenu && (
        <div className="px-2.5 pb-2.5 pt-0.5 space-y-2.5 animate-fade">
          {plato.requiereProteina && (
            <div>
              <div className="text-[12px] font-medium text-etiqueta mb-1">Proteínas disponibles hoy</div>
              <div className="flex flex-wrap gap-1.5">
                {proteinas.length === 0 && <span className="text-[12px] text-texto-terciario">Agrega proteínas abajo primero.</span>}
                {proteinas.map((p) => {
                  const activa = item?.proteinas?.includes(p.nombre);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onToggleProteina(p.nombre)}
                      className={`px-2.5 py-1.5 rounded-full text-[12.5px] border transition ${
                        activa ? "bg-terracota border-terracota text-white font-medium" : "bg-crema border-arena text-texto-inactivo"
                      }`}
                    >
                      {p.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            {plato.categoria !== "segundo" && plato.categoria !== "entrada" ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] text-etiqueta">Precio:</span>
                <span className="text-[12px]">S/</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={`${inputStyle} w-16 py-1 text-[13px]`}
                  value={plato.precioExtra}
                  onChange={(e) => onPrecioExtra(Number(e.target.value) || 0)}
                />
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onToggleAgotado}
              className={`flex items-center gap-1.5 text-[12.5px] font-medium px-2.5 py-1.5 rounded-full border transition ${
                agotado ? "bg-terracota border-terracota text-white" : "border-arena-oscura text-texto-secundario"
              }`}
            >
              <Ban size={13} /> {agotado ? "Agotado" : "Marcar agotado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MenuTab({
  platos,
  proteinas,
  menuDia,
  menuHoy,
  dia,
  diasAnteriores,
  cargandoDiasAnteriores,
  onAbrirDias,
  onCopiar,
  onToggleItem,
  onToggleProteina,
  onToggleAgotado,
  onGuardarPrecios,
  onPrecioExtra,
  guardandoPrecios,
}) {
  const [precios, setPrecios] = useState(null);
  const valoresPrecios = precios || {
    precioRecojo: dia?.precioRecojo ?? "",
    precioDelivery: dia?.precioDelivery ?? "",
    precioEntradaExtra: dia?.precioEntradaExtra ?? "",
    refresco: dia?.refresco ?? "",
  };
  const actualizarPrecio = (campo, valor) => setPrecios({ ...valoresPrecios, [campo]: valor });

  const itemsPorId = useMemo(() => new Map(menuDia.items.map((it) => [it.platoId, it])), [menuDia.items]);

  const porCategoria = (cat) => platos.filter((p) => p.activo && p.categoria === cat);

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4 space-y-3">
        <div className="text-[14px] font-semibold text-tinta">Precios de hoy</div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Recojo">
            <input type="number" min="0" step="0.5" className={inputStyle} value={valoresPrecios.precioRecojo} onChange={(e) => actualizarPrecio("precioRecojo", e.target.value)} />
          </Field>
          <Field label="Delivery">
            <input type="number" min="0" step="0.5" className={inputStyle} value={valoresPrecios.precioDelivery} onChange={(e) => actualizarPrecio("precioDelivery", e.target.value)} />
          </Field>
          <Field label="Entrada extra">
            <input type="number" min="0" step="0.5" className={inputStyle} value={valoresPrecios.precioEntradaExtra} onChange={(e) => actualizarPrecio("precioEntradaExtra", e.target.value)} />
          </Field>
        </div>
        <Field label="Refresco del día (incluido)">
          <input className={inputStyle} value={valoresPrecios.refresco} onChange={(e) => actualizarPrecio("refresco", e.target.value)} placeholder="Ej: Chicha morada" />
        </Field>
        <button
          onClick={() => onGuardarPrecios(valoresPrecios).then(() => setPrecios(null))}
          disabled={guardandoPrecios}
          className="btn-cta-salvia w-full bg-salvia hover:bg-salvia-oscura disabled:opacity-60 text-white font-medium rounded-xl py-2.5 text-[14px] flex items-center justify-center gap-2"
        >
          {guardandoPrecios && <Loader2 size={15} className="animate-spin" />}
          Guardar precios
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4">
        <details className="group" onToggle={(e) => e.target.open && onAbrirDias()}>
          <summary className="list-none flex items-center justify-between cursor-pointer select-none">
            <span className="text-[14px] font-semibold text-tinta flex items-center gap-1.5">
              <Copy size={15} /> Copiar menú de otro día
            </span>
            <ChevronDown size={16} className="text-texto-terciario transition group-open:rotate-180" />
          </summary>
          <div className="mt-3">
            {cargandoDiasAnteriores ? (
              <div className="text-[13px] text-texto-terciario flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Buscando menús anteriores…
              </div>
            ) : diasAnteriores.length === 0 ? (
              <p className="text-[13px] text-texto-terciario">Todavía no hay ningún menú anterior guardado.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {diasAnteriores.map((d) => (
                  <button
                    key={d.fecha}
                    onClick={() => onCopiar(d.fecha)}
                    className="w-full flex items-center justify-between text-left bg-crema hover:bg-arena/40 rounded-lg px-3 py-2 text-[13.5px] text-[#3a332b]"
                  >
                    <span>{d.fecha}</span>
                    <span className="text-texto-terciario">{d.cantidad} plato{d.cantidad > 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>

      {CATEGORIAS.map((cat) => {
        const lista = porCategoria(cat.id);
        if (lista.length === 0) return null;
        return (
          <div key={cat.id}>
            <h3 className="font-display text-lg text-tinta mb-2.5 flex items-center gap-1.5">
              <span>{cat.emoji}</span> {cat.label}
            </h3>
            <div className="space-y-2">
              {lista.map((plato) => {
                const item = itemsPorId.get(plato.id);
                return (
                  <FilaPlato
                    key={plato.id}
                    plato={plato}
                    item={item}
                    enMenu={!!item}
                    proteinas={proteinas}
                    onToggle={() => onToggleItem(plato)}
                    onToggleProteina={(nombre) => onToggleProteina(plato, item, nombre)}
                    onToggleAgotado={() => onToggleAgotado(item)}
                    onPrecioExtra={(valor) => onPrecioExtra(plato, valor)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {platos.filter((p) => p.activo).length === 0 && (
        <EmptyState text="Todavía no hay platos en el catálogo. Agrégalos en la pestaña Platos." />
      )}

      <p className="text-[12.5px] text-texto-terciario text-center">
        {menuHoy.total} plato{menuHoy.total === 1 ? "" : "s"} en el menú de hoy · Menú completo {soles(dia?.precioRecojo ?? 0)}
      </p>
    </div>
  );
}
