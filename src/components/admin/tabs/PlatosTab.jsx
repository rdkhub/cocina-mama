// src/components/admin/tabs/PlatosTab.jsx
// Catálogo de platos: crear, editar, subir foto, desactivar (nunca se borran).
import React, { useState, useRef } from "react";
import { Plus, Pencil, Ban, RotateCcw, Camera, Loader2, X } from "lucide-react";
import { FotoPlato, Field, inputStyle, Sheet, Switch, EmptyState } from "../../ui";
import { CATEGORIAS, fotoEnUso } from "../../../lib/catalogo";
import { comprimirFoto } from "../../../lib/imagen";

const PLATO_VACIO = {
  id: null,
  nombre: "",
  categoria: "segundo",
  descripcion: "",
  fotoUrl: "",
  fotoPath: "",
  fotosProteina: {},
  requiereProteina: false,
  permiteArroz: false,
  precioExtra: 0,
  activo: true,
};

export function PlatosTab({ platos, proteinas = [], onGuardar, onCambiarActivo, onSubirFoto, onBorrarFoto, showToast }) {
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState(null); // objeto plato o null
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoProteina, setSubiendoProteina] = useState(""); // nombre de la proteína que se está subiendo
  const fileRef = useRef(null);
  const fileProteinaRef = useRef(null);
  const proteinaDestino = useRef("");

  // Borra un archivo viejo solo si ningún otro plato lo usa (hay fotos compartidas).
  const borrarSiNoSeUsa = (path, plato) => {
    if (!path) return;
    const siguePuesto =
      plato.fotoPath === path || Object.values(plato.fotosProteina || {}).some((f) => f.path === path);
    if (!siguePuesto && !fotoEnUso(platos, path, plato.id)) onBorrarFoto(path);
  };

  const lista = platos.filter((p) => filtro === "todos" || p.categoria === filtro).filter((p) => (filtro === "inactivos" ? !p.activo : true));
  const visibles = filtro === "inactivos" ? platos.filter((p) => !p.activo) : lista.filter((p) => p.activo || filtro === "todos");

  const abrirNuevo = () => setEditando({ ...PLATO_VACIO });
  const abrirEditar = (p) => setEditando({ ...p });

  const guardar = async () => {
    if (!editando.nombre.trim()) return showToast("Ponle un nombre al plato.");
    setGuardando(true);
    try {
      await onGuardar(editando);
      setEditando(null);
    } catch (e) {
      showToast(e.message || "No se pudo guardar el plato.");
    } finally {
      setGuardando(false);
    }
  };

  const elegirFoto = async (file) => {
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const blob = await comprimirFoto(file);
      const { url, path } = await onSubirFoto(blob, editando.nombre || "plato");
      const nuevo = { ...editando, fotoUrl: url, fotoPath: path };
      borrarSiNoSeUsa(editando.fotoPath, nuevo);
      setEditando((prev) => ({ ...prev, fotoUrl: url, fotoPath: path }));
    } catch (e) {
      showToast(e.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const elegirFotoProteina = async (file) => {
    const prot = proteinaDestino.current;
    if (!file || !prot) return;
    setSubiendoProteina(prot);
    try {
      const blob = await comprimirFoto(file);
      const { url, path } = await onSubirFoto(blob, `${editando.nombre || "plato"}-${prot}`);
      const anterior = editando.fotosProteina?.[prot]?.path;
      const fotosProteina = { ...(editando.fotosProteina || {}), [prot]: { url, path } };
      borrarSiNoSeUsa(anterior, { ...editando, fotosProteina });
      setEditando((prev) => ({ ...prev, fotosProteina: { ...(prev.fotosProteina || {}), [prot]: { url, path } } }));
    } catch (e) {
      showToast(e.message || "No se pudo subir la foto.");
    } finally {
      setSubiendoProteina("");
      if (fileProteinaRef.current) fileProteinaRef.current.value = "";
    }
  };

  const quitarFotoProteina = (prot) =>
    setEditando((prev) => {
      const fotosProteina = { ...(prev.fotosProteina || {}) };
      delete fotosProteina[prot];
      return { ...prev, fotosProteina };
    });

  // Proteínas que se muestran en el editor: las de la tabla y, por si acaso,
  // las que ya tienen foto aunque se hayan renombrado.
  const nombresProteina = editando
    ? Array.from(new Set([...proteinas.map((p) => p.nombre), ...Object.keys(editando.fotosProteina || {})]))
    : [];

  return (
    <div className="pb-10">
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {[{ id: "todos", label: "Todos" }, ...CATEGORIAS, { id: "inactivos", label: "Desactivados" }].map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltro(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium border transition ${
              filtro === c.id ? "bg-tinta text-white border-tinta" : "bg-white text-texto-secundario border-arena"
            }`}
          >
            {c.emoji ? `${c.emoji} ` : ""}
            {c.label}
          </button>
        ))}
      </div>

      <button
        onClick={abrirNuevo}
        className="btn-cta w-full mb-4 bg-terracota hover:bg-terracota-oscura text-white font-medium rounded-xl py-3 text-[14.5px] flex items-center justify-center gap-2"
      >
        <Plus size={17} /> Agregar plato nuevo
      </button>

      {visibles.length === 0 && <EmptyState text="No hay platos en esta categoría todavía." />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {visibles.map((p) => (
          <div key={p.id} className={`bg-white rounded-2xl border shadow-card overflow-hidden ${p.activo ? "border-[#eee2cb]" : "border-arena opacity-60"}`}>
            <button onClick={() => abrirEditar(p)} className="block w-full text-left">
              <FotoPlato plato={p} rounded="rounded-none" className="w-full aspect-[4/3]" />
              <div className="px-2.5 py-2">
                <div className="text-[13px] font-medium text-tinta leading-snug line-clamp-2">{p.nombre}</div>
                {p.categoria === "segundo" && p.requiereProteina && (
                  <div className="text-[11px] text-ocre mt-0.5">
                    Con proteína
                    {Object.keys(p.fotosProteina || {}).length > 0 && ` · ${Object.keys(p.fotosProteina).length} foto${Object.keys(p.fotosProteina).length > 1 ? "s" : ""}`}
                  </div>
                )}
                {(p.categoria === "postre" || p.categoria === "bebida" || p.categoria === "adicional") && (
                  <div className="text-[11px] text-ocre mt-0.5">S/ {p.precioExtra.toFixed(2)}</div>
                )}
              </div>
            </button>
            <div className="flex border-t border-divisor">
              <button onClick={() => abrirEditar(p)} className="flex-1 flex items-center justify-center gap-1 text-[12px] text-texto-secundario py-2 hover:bg-crema">
                <Pencil size={13} /> Editar
              </button>
              <button
                onClick={() => onCambiarActivo(p.id, !p.activo)}
                className={`flex-1 flex items-center justify-center gap-1 text-[12px] py-2 border-l border-divisor hover:bg-crema ${p.activo ? "text-terracota" : "text-salvia"}`}
              >
                {p.activo ? <Ban size={13} /> : <RotateCcw size={13} />}
                {p.activo ? "Desactivar" : "Reactivar"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Sheet
        open={!!editando}
        onClose={() => setEditando(null)}
        title={editando?.id ? "Editar plato" : "Plato nuevo"}
        footer={
          <button
            onClick={guardar}
            disabled={guardando}
            className="btn-cta w-full bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white font-medium rounded-xl py-3 text-[14.5px] flex items-center justify-center gap-2"
          >
            {guardando && <Loader2 size={16} className="animate-spin" />}
            Guardar plato
          </button>
        }
      >
        {editando && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <FotoPlato plato={editando} className="w-32 h-32" iconSize={32} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={subiendoFoto}
                  className="absolute -bottom-1.5 -right-1.5 w-10 h-10 rounded-full bg-terracota text-white flex items-center justify-center shadow-lg"
                  aria-label="Cambiar foto"
                >
                  {subiendoFoto ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                </button>
                {editando.fotoUrl && (
                  <button
                    onClick={() => setEditando((p) => ({ ...p, fotoUrl: "", fotoPath: "" }))}
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-tinta text-white flex items-center justify-center"
                    aria-label="Quitar foto"
                  >
                    <X size={14} />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => elegirFoto(e.target.files?.[0])} />
              </div>
            </div>

            <Field label="Nombre del plato">
              <input className={inputStyle} value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} placeholder="Ej: Lomo saltado" />
            </Field>

            <Field label="Categoría">
              <select className={inputStyle} value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Descripción (opcional)">
              <input className={inputStyle} value={editando.descripcion} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} placeholder="Ej: Con papas fritas y arroz" />
            </Field>

            {editando.categoria === "segundo" && (
              <>
                <div className="flex items-center justify-between bg-crema rounded-xl px-3.5 py-3">
                  <span className="text-[14px] text-tinta">Se elige proteína</span>
                  <Switch checked={editando.requiereProteina} onChange={(v) => setEditando({ ...editando, requiereProteina: v })} />
                </div>
                {editando.requiereProteina && nombresProteina.length > 0 && (
                  <div className="bg-crema rounded-xl px-3.5 py-3">
                    <div className="text-[14px] text-tinta font-medium">Foto por proteína (opcional)</div>
                    <p className="text-[12.5px] text-texto-secundario mb-2.5">
                      Cuando el cliente elige la proteína, ve esta foto. Si no hay, se usa la foto principal.
                    </p>
                    <div className="space-y-2">
                      {nombresProteina.map((prot) => {
                        const foto = editando.fotosProteina?.[prot];
                        const cargando = subiendoProteina === prot;
                        return (
                          <div key={prot} className="flex items-center gap-2.5 bg-white rounded-xl p-1.5 pr-2">
                            <FotoPlato plato={editando} src={foto?.url} className={`w-12 h-12 shrink-0 ${foto ? "" : "opacity-40"}`} iconSize={18} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[13.5px] text-tinta truncate">{prot}</div>
                              <div className="text-[11.5px] text-texto-terciario">{foto ? "Con foto propia" : "Usa la foto principal"}</div>
                            </div>
                            {foto && (
                              <button
                                type="button"
                                onClick={() => quitarFotoProteina(prot)}
                                className="w-8 h-8 rounded-full border border-arena text-texto-secundario flex items-center justify-center"
                                aria-label={`Quitar foto de ${prot}`}
                              >
                                <X size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!!subiendoProteina}
                              onClick={() => {
                                proteinaDestino.current = prot;
                                fileProteinaRef.current?.click();
                              }}
                              className="w-8 h-8 rounded-full bg-terracota text-white flex items-center justify-center disabled:opacity-60"
                              aria-label={`${foto ? "Cambiar" : "Subir"} foto de ${prot}`}
                            >
                              {cargando ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <input
                      ref={fileProteinaRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => elegirFotoProteina(e.target.files?.[0])}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between bg-crema rounded-xl px-3.5 py-3">
                  <span className="text-[14px] text-tinta">Se puede pedir sin arroz</span>
                  <Switch checked={editando.permiteArroz} onChange={(v) => setEditando({ ...editando, permiteArroz: v })} />
                </div>
              </>
            )}

            {(editando.categoria === "postre" || editando.categoria === "bebida" || editando.categoria === "adicional") && (
              <Field label="Precio">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] text-texto-secundario">S/</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={inputStyle}
                    value={editando.precioExtra}
                    onChange={(e) => setEditando({ ...editando, precioExtra: Number(e.target.value) || 0 })}
                  />
                </div>
              </Field>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
