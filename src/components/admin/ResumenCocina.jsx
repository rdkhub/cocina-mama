// src/components/admin/ResumenCocina.jsx
// "Para la cocina": cuántos de cada plato hay que preparar hoy, sin nombres
// de clientes. Se puede ver todo el día o solo lo que falta servir, y
// mandarlo por WhatsApp o copiarlo para pasárselo al que cocina.
import { useMemo, useState } from "react";
import { ChefHat, Copy, Send, Check } from "lucide-react";
import { conteoCocina, textoCocina } from "../../lib/cuaderno";
import { avisar } from "../ui";

function Numero({ n }) {
  return <span className="min-w-[2.6rem] h-9 px-2 rounded-xl bg-terracota text-white font-bold text-[17px] tabular-nums flex items-center justify-center shrink-0">{n}</span>;
}

function Grupo({ titulo, children }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-texto-terciario mb-1.5">{titulo}</div>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

export function ResumenCocina({ orders }) {
  const [soloFalta, setSoloFalta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const reales = orders.filter((o) => !o.nombre.toLowerCase().includes("prueba"));
  const lista = soloFalta ? reales.filter((o) => !o.listo) : reales;
  const c = useMemo(() => conteoCocina(lista), [lista]);
  const titulo = soloFalta ? "Falta servir" : "Para la cocina (todo el día)";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCocina(c, titulo));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      avisar("Copiado para la cocina", "success");
    } catch {
      avisar("No se pudo copiar.");
    }
  };
  const mandar = () => window.open(`https://wa.me/?text=${encodeURIComponent(textoCocina(c, titulo))}`, "_blank", "noopener");

  if (!reales.length) return null;

  return (
    <section aria-labelledby="titulo-cocina" className="bg-white rounded-3xl border border-[#eee2cb] shadow-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <ChefHat size={20} className="text-terracota" />
        <h2 id="titulo-cocina" className="font-display text-[1.3rem] text-tinta leading-none">
          Para la cocina
        </h2>
        <span className="ml-auto text-[13px] text-texto-secundario">
          <b className="text-tinta">{c.menus}</b> menús
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-crema rounded-full p-1 mb-4" role="tablist" aria-label="Qué contar">
        {[
          [false, "Todo el día"],
          [true, "Falta servir"],
        ].map(([v, t]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={soloFalta === v}
            onClick={() => setSoloFalta(v)}
            className={`rounded-full py-2 text-[14px] font-semibold transition ${soloFalta === v ? "bg-tinta text-white shadow-card" : "text-texto-secundario"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {c.menus === 0 && !c.entradas.length && !c.extras.length ? (
        <p className="text-[14.5px] text-texto-secundario text-center py-3">{soloFalta ? "Todo está servido. 🎉" : "Todavía no hay platos."}</p>
      ) : (
        <div className="space-y-4">
          {c.segundos.length > 0 && (
            <Grupo titulo="Segundos">
              {c.segundos.map((s) => (
                <li key={s.nombre} className="rounded-2xl bg-crema/70 px-2.5 py-2">
                  <div className="flex items-center gap-3">
                    <Numero n={s.cantidad} />
                    <span className="font-semibold text-[16px] text-tinta leading-snug">{s.nombre}</span>
                  </div>
                  {s.variantes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pl-[3.35rem]">
                      {s.variantes.map((v) => (
                        <span key={v.texto} className="text-[13.5px] bg-white border border-arena rounded-full px-2.5 py-1 text-tinta">
                          <b className="tabular-nums">{v.cantidad}</b> {v.texto}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </Grupo>
          )}
          {c.entradas.length > 0 && (
            <Grupo titulo="Entradas">
              {c.entradas.map((e) => (
                <li key={e.nombre} className="flex items-center gap-3 rounded-2xl bg-crema/70 px-2.5 py-2">
                  <Numero n={e.cantidad} />
                  <span className="font-semibold text-[16px] text-tinta leading-snug">{e.nombre}</span>
                </li>
              ))}
            </Grupo>
          )}
          {c.extras.length > 0 && (
            <Grupo titulo="Extras">
              {c.extras.map((e) => (
                <li key={e.nombre} className="flex items-center gap-3 rounded-2xl bg-crema/70 px-2.5 py-2">
                  <Numero n={e.cantidad} />
                  <span className="font-semibold text-[16px] text-tinta leading-snug">{e.nombre}</span>
                </li>
              ))}
            </Grupo>
          )}
          <p className="text-[13px] text-texto-secundario">
            {c.pedidos} pedidos · {c.llevar} para llevar · {c.delivery} delivery
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={mandar} className="btn-cta-salvia flex items-center justify-center gap-2 rounded-2xl bg-salvia text-white font-semibold text-[14.5px] py-3">
              <Send size={16} /> WhatsApp
            </button>
            <button type="button" onClick={copiar} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-arena bg-white text-tinta font-semibold text-[14.5px] py-3">
              {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
