// src/components/admin/tabs/MenuTab.jsx
// "Armar menú de hoy" en dos partes:
//  1. Hoy en el menú: lo que ya está publicado, en el orden en que lo ve el
//     cliente (se reordena arrastrando ⋮⋮). Ahí se marcan proteínas, agotados
//     y precios de los extras.
//  2. Agregar del catálogo: buscador + platos que todavía no están hoy.
// Los precios del día quedan en una sola línea con un botón "Editar".
import { useState, useMemo } from "react";
import { m, AnimatePresence } from "motion/react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ban, Copy, Loader2, ChevronDown, Search, Plus, X, GripVertical, Pencil, Check } from "lucide-react";
import { FotoPlato, Field, inputStyle, EmptyState, vibrar } from "../../ui";
import { CATEGORIAS, CATEGORIAS_EXTRA } from "../../../lib/catalogo";
import { soles } from "../../../utils/pedidos";

const normalizar = (t) =>
  (t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const CATEGORIAS_NUEVO = [
  { id: "segundo", label: "Segundo" },
  { id: "entrada", label: "Entrada" },
  { id: "adicional", label: "Extra" },
];

// Grupos de "Hoy en el menú" (los extras van juntos, como los ve el cliente).
const GRUPOS = [
  { id: "segundo", label: "Segundos", cats: ["segundo"], emoji: "🍛" },
  { id: "entrada", label: "Entradas", cats: ["entrada"], emoji: "🥗" },
  { id: "extra", label: "Extras", cats: CATEGORIAS_EXTRA, emoji: "🥤" },
];

function FilaHoy({ plato, item, proteinas, onQuitar, onToggleProteina, onToggleAgotado, onPrecioExtra }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const agotado = item.agotado;
  const esExtra = CATEGORIAS_EXTRA.includes(plato.categoria);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-2xl bg-white border-2 transition-shadow ${
        isDragging ? "z-20 shadow-elegida border-terracota scale-[1.02]" : agotado ? "border-[#eadfcb]" : "border-transparent shadow-card"
      }`}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mover ${plato.nombre}`}
          className="touch-none w-8 h-12 -ml-1 flex items-center justify-center text-arena-hover active:text-terracota cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={20} />
        </button>
        <div className={agotado ? "grayscale opacity-70" : ""}>
          <FotoPlato plato={plato} className="w-12 h-12 shrink-0" rounded="rounded-xl" iconSize={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[15px] font-semibold leading-snug ${agotado ? "text-texto-terciario line-through" : "text-tinta"}`}>{plato.nombre}</div>
          {agotado && <div className="text-[12px] font-semibold text-terracota uppercase tracking-wide">Agotado hoy</div>}
        </div>
        <button type="button" onClick={onQuitar} aria-label={`Quitar ${plato.nombre} del menú de hoy`} className="w-9 h-9 rounded-full flex items-center justify-center text-texto-terciario hover:text-terracota hover:bg-crema shrink-0">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-3 -mt-1 pl-12 space-y-2">
        {plato.requiereProteina && (
            <div className="flex flex-wrap gap-1.5">
              {proteinas.length === 0 && <span className="text-[12.5px] text-texto-terciario">Agrega proteínas en la pestaña Platos.</span>}
              {proteinas.map((p) => {
                const activa = item.proteinas?.includes(p.nombre);
                return (
                  <m.button
                    key={p.id}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => onToggleProteina(p.nombre)}
                    className={`px-3 py-1.5 rounded-full text-[13px] border-2 transition-colors ${
                      activa ? "bg-terracota border-terracota text-white font-semibold" : "bg-crema border-transparent text-texto-inactivo"
                    }`}
                  >
                    {activa && <Check size={12} strokeWidth={3} className="inline -mt-0.5 mr-0.5" />}
                    {p.nombre}
                  </m.button>
                );
              })}
            </div>
          )}
        <div className="flex items-center justify-between gap-2">
          {esExtra ? (
            <label className="flex items-center gap-1.5 text-[13px] text-etiqueta">
              Precio S/
              <input
                type="number"
                min="0"
                step="0.5"
                inputMode="decimal"
                className={`${inputStyle} w-20 py-1.5 text-[14px]`}
                value={plato.precioExtra}
                onChange={(e) => onPrecioExtra(Number(e.target.value) || 0)}
              />
            </label>
          ) : (
            <span />
          )}
          <m.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={() => {
              vibrar();
              onToggleAgotado();
            }}
            className={`flex items-center gap-1 text-[12.5px] font-semibold px-3 py-1.5 rounded-full border-2 transition-colors ${
              agotado ? "bg-tinta border-tinta text-white" : "border-arena text-texto-secundario"
            }`}
          >
            <Ban size={13} /> {agotado ? "Hay de nuevo" : "Marcar agotado"}
          </m.button>
        </div>
      </div>
    </div>
  );
}

function GrupoHoy({ grupo, filas, proteinas, onReordenar, ...acciones }) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = filas.map((f) => f.item.id);
  const alSoltar = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    vibrar(12);
    onReordenar(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };
  return (
    <div>
      <h4 className="text-[13px] font-semibold uppercase tracking-wide text-texto-terciario mb-2 flex items-center gap-1.5">
        <span>{grupo.emoji}</span> {grupo.label} <span className="font-normal normal-case tracking-normal">· {filas.length}</span>
      </h4>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragStart={() => vibrar(10)} onDragEnd={alSoltar}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {filas.map(({ plato, item }) => (
              <FilaHoy
                key={item.id}
                plato={plato}
                item={item}
                proteinas={proteinas}
                onQuitar={() => acciones.onToggleItem(plato)}
                onToggleProteina={(nombre) => acciones.onToggleProteina(plato, item, nombre)}
                onToggleAgotado={() => acciones.onToggleAgotado(item)}
                onPrecioExtra={(valor) => acciones.onPrecioExtra(plato, valor)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Precios({ dia, onGuardarPrecios, guardandoPrecios }) {
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState(null);
  const v = valores || {
    precioRecojo: dia?.precioRecojo ?? "",
    precioDelivery: dia?.precioDelivery ?? "",
    precioEntradaExtra: dia?.precioEntradaExtra ?? "",
    refresco: dia?.refresco ?? "",
  };
  const cambiar = (campo, valor) => setValores({ ...v, [campo]: valor });
  const guardar = () =>
    onGuardarPrecios(v).then(() => {
      setValores(null);
      setEditando(false);
    });

  return (
    <div className="bg-white rounded-3xl border border-[#eee2cb] shadow-card overflow-hidden">
      <button type="button" onClick={() => setEditando((x) => !x)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-texto-terciario mb-1">Precios de hoy</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-tinta">
            <span>
              Menú <b className="font-mono">{soles(dia?.precioRecojo ?? 0)}</b>
            </span>
            <span>
              Delivery <b className="font-mono">{soles(dia?.precioDelivery ?? 0)}</b>
            </span>
            <span>
              Entrada extra <b className="font-mono">{soles(dia?.precioEntradaExtra ?? 0)}</b>
            </span>
          </div>
          {dia?.refresco && <div className="text-[13px] text-texto-secundario mt-0.5">Refresco: {dia.refresco}</div>}
        </div>
        <span className={`shrink-0 flex items-center gap-1 text-[13px] font-semibold rounded-full px-3 py-2 ${editando ? "bg-crema text-texto-secundario" : "bg-terracota/10 text-terracota"}`}>
          {editando ? <X size={14} /> : <Pencil size={14} />} {editando ? "Cerrar" : "Editar"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {editando && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-divisor pt-3">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Recojo">
                  <input type="number" min="0" step="0.5" inputMode="decimal" className={inputStyle} value={v.precioRecojo} onChange={(e) => cambiar("precioRecojo", e.target.value)} />
                </Field>
                <Field label="Delivery">
                  <input type="number" min="0" step="0.5" inputMode="decimal" className={inputStyle} value={v.precioDelivery} onChange={(e) => cambiar("precioDelivery", e.target.value)} />
                </Field>
                <Field label="Entrada extra">
                  <input type="number" min="0" step="0.5" inputMode="decimal" className={inputStyle} value={v.precioEntradaExtra} onChange={(e) => cambiar("precioEntradaExtra", e.target.value)} />
                </Field>
              </div>
              <Field label="Refresco del día (incluido)">
                <input className={inputStyle} value={v.refresco} onChange={(e) => cambiar("refresco", e.target.value)} placeholder="Ej: Chicha morada" />
              </Field>
              <button
                onClick={guardar}
                disabled={guardandoPrecios}
                className="btn-cta-salvia w-full bg-salvia hover:bg-salvia-oscura disabled:opacity-60 text-white font-semibold rounded-2xl py-3 text-[15px] flex items-center justify-center gap-2"
              >
                {guardandoPrecios && <Loader2 size={15} className="animate-spin" />}
                Guardar precios
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
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
  onReordenar,
  guardandoPrecios,
  onCrearYAgregar,
}) {
  const [busqueda, setBusqueda] = useState("");
  const [creando, setCreando] = useState("");

  const platosPorId = useMemo(() => new Map(platos.map((p) => [p.id, p])), [platos]);
  const itemsPorPlato = useMemo(() => new Map(menuDia.items.map((it) => [it.platoId, it])), [menuDia.items]);

  // Hoy en el menú, en el orden guardado.
  const hoy = useMemo(
    () =>
      [...menuDia.items]
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((item) => ({ item, plato: platosPorId.get(item.platoId) }))
        .filter((x) => x.plato),
    [menuDia.items, platosPorId]
  );

  const q = normalizar(busqueda);
  const coincide = (p) => !q || normalizar(p.nombre).includes(q);
  const catalogo = (cat) => platos.filter((p) => p.activo && p.categoria === cat && !itemsPorPlato.has(p.id) && coincide(p));
  const existeExacto = platos.some((p) => p.activo && normalizar(p.nombre) === q);
  const nombreNuevo = busqueda.trim().replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const hayResultados = platos.some((p) => p.activo && !itemsPorPlato.has(p.id) && coincide(p));

  const crear = async (categoria) => {
    setCreando(categoria);
    const ok = await onCrearYAgregar(nombreNuevo, categoria);
    setCreando("");
    if (ok) setBusqueda("");
  };

  // El orden se guarda para todo el menú (segundos, luego entradas, luego extras).
  const reordenarGrupo = (grupo, idsGrupo) => {
    const ids = GRUPOS.flatMap((g) => (g.id === grupo.id ? idsGrupo : hoy.filter((x) => g.cats.includes(x.plato.categoria)).map((x) => x.item.id)));
    onReordenar(ids);
  };

  const acciones = { onToggleItem, onToggleProteina, onToggleAgotado, onPrecioExtra };

  return (
    <div className="space-y-6 pb-10">
      <Precios dia={dia} onGuardarPrecios={onGuardarPrecios} guardandoPrecios={guardandoPrecios} />

      {/* 1. Hoy en el menú */}
      <section className="bg-crema-hover/60 rounded-3xl p-3.5 border border-[#eee2cb]">
        <div className="flex items-baseline justify-between mb-3 px-0.5">
          <h3 className="font-display text-[1.3rem] text-tinta">Hoy en el menú</h3>
          <span className="text-[13px] text-texto-secundario">
            {hoy.length} plato{hoy.length === 1 ? "" : "s"}
          </span>
        </div>
        {hoy.length === 0 ? (
          <EmptyState text="Todavía no hay platos hoy. Agrégalos desde el catálogo de abajo o copia el menú de otro día." />
        ) : (
          <div className="space-y-4">
            {GRUPOS.map((g) => {
              const filas = hoy.filter((x) => g.cats.includes(x.plato.categoria));
              if (!filas.length) return null;
              return <GrupoHoy key={g.id} grupo={g} filas={filas} proteinas={proteinas} onReordenar={(ids) => reordenarGrupo(g, ids)} {...acciones} />;
            })}
            <p className="text-[12.5px] text-texto-terciario text-center">Arrastra ⋮⋮ para cambiar el orden en que lo ven los clientes.</p>
          </div>
        )}
      </section>

      <div className="bg-white rounded-3xl border border-[#eee2cb] shadow-card p-4">
        <details className="group" onToggle={(e) => e.target.open && onAbrirDias()}>
          <summary className="list-none flex items-center justify-between cursor-pointer select-none">
            <span className="text-[14.5px] font-semibold text-tinta flex items-center gap-1.5">
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
                    className="w-full flex items-center justify-between text-left bg-crema hover:bg-arena/40 rounded-xl px-3 py-2.5 text-[14px] text-[#3a332b]"
                  >
                    <span>{d.fecha}</span>
                    <span className="text-texto-terciario">
                      {d.cantidad} plato{d.cantidad > 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* 2. Agregar del catálogo */}
      <section>
        <h3 className="font-display text-[1.3rem] text-tinta mb-2.5 px-0.5">Agregar del catálogo</h3>
        <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 bg-crema">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-terciario" />
            <input
              className={`${inputStyle} pl-10 pr-10 rounded-2xl py-3`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar o agregar un plato (ej: arroz con chancho)"
              aria-label="Buscar o agregar un plato"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-texto-terciario"
                aria-label="Borrar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {q.length >= 3 && !existeExacto && (
            <div className="mt-2 bg-white border-2 border-dashed border-terracota/50 rounded-2xl p-3 animate-fade">
              <div className="text-[14px] text-tinta mb-2">
                {hayResultados ? "¿No es ninguno de estos? " : "No está en la lista. "}Agregar <b>«{nombreNuevo}»</b> al menú de hoy como:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIAS_NUEVO.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => crear(c.id)}
                    disabled={!!creando}
                    className="bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white rounded-xl py-2.5 text-[14px] font-semibold flex items-center justify-center gap-1"
                  >
                    {creando === c.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-[12px] text-texto-terciario mt-2">Después puedes ponerle foto, proteínas o precio en la pestaña Platos.</p>
            </div>
          )}
        </div>

        <div className="space-y-5 mt-2">
          {CATEGORIAS.map((cat) => {
            const lista = catalogo(cat.id);
            if (lista.length === 0) return null;
            return (
              <div key={cat.id}>
                <h4 className="text-[13px] font-semibold uppercase tracking-wide text-texto-terciario mb-2 flex items-center gap-1.5">
                  <span>{cat.emoji}</span> {cat.label}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {lista.map((plato) => (
                    <m.button
                      key={plato.id}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        vibrar();
                        onToggleItem(plato);
                      }}
                      className="flex items-center gap-2 bg-white rounded-2xl shadow-card p-2 pr-2.5 text-left border-2 border-transparent hover:border-terracota/40"
                    >
                      <FotoPlato plato={plato} className="w-10 h-10 shrink-0" rounded="rounded-xl" iconSize={18} />
                      <span className="flex-1 min-w-0 text-[13.5px] font-medium text-tinta leading-snug line-clamp-2">{plato.nombre}</span>
                      <span className="w-7 h-7 rounded-full bg-terracota text-white flex items-center justify-center shrink-0">
                        <Plus size={15} strokeWidth={2.6} />
                      </span>
                    </m.button>
                  ))}
                </div>
              </div>
            );
          })}
          {!hayResultados && !q && platos.some((p) => p.activo) && <p className="text-[13.5px] text-texto-secundario text-center py-2">Todos los platos del catálogo ya están en el menú de hoy.</p>}
        </div>
      </section>

      {platos.filter((p) => p.activo).length === 0 && <EmptyState text="Todavía no hay platos en el catálogo. Agrégalos en la pestaña Platos." />}

      <p className="text-[12.5px] text-texto-terciario text-center">
        {menuHoy.total} plato{menuHoy.total === 1 ? "" : "s"} en el menú de hoy · Menú completo {soles(dia?.precioRecojo ?? 0)}
      </p>
    </div>
  );
}
