// src/components/client/ResumenPedido.jsx
import { m, AnimatePresence } from "motion/react";
import { Minus, Plus, AlertCircle, Trash2 } from "lucide-react";
import { FotoPlato, vibrar } from "../ui";
import { soles } from "../../utils/pedidos";

function Stepper({ cantidad, onCambiar, nombre }) {
  const tocar = (d) => {
    vibrar();
    onCambiar(d);
  };
  return (
    <div className="flex items-center gap-1.5 shrink-0 bg-crema rounded-full p-1">
      <m.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => tocar(-1)}
        aria-label={cantidad === 1 ? `Quitar ${nombre}` : `Quitar uno: ${nombre}`}
        style={{ touchAction: "manipulation" }}
        className="w-9 h-9 rounded-full bg-white shadow-card text-texto-secundario flex items-center justify-center"
      >
        {cantidad === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
      </m.button>
      <m.span key={cantidad} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="w-5 text-center text-[15.5px] font-bold text-tinta">
        {cantidad}
      </m.span>
      <m.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => tocar(1)}
        aria-label={`Agregar uno: ${nombre}`}
        style={{ touchAction: "manipulation" }}
        className="w-9 h-9 rounded-full bg-white shadow-card text-terracota flex items-center justify-center"
      >
        <Plus size={15} strokeWidth={2.6} />
      </m.button>
    </div>
  );
}

// Lista editable de lo que lleva el cliente. "lineas" viene armado desde
// ClientView: { key, plato, foto, titulo, detalle, precioUnit, cantidad, problema, onCambiar }.
export function ResumenPedido({ lineas, total, compacto }) {
  return (
    <div className="bg-white rounded-3xl shadow-card border border-[#eee2cb] overflow-hidden">
      <AnimatePresence initial={false}>
        {lineas.map((l) => (
          <m.div
            key={l.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-b border-divisor"
          >
            <div className="flex items-center gap-3 p-3">
              {!compacto && <FotoPlato plato={l.plato} src={l.foto} className="w-14 h-14 shrink-0" rounded="rounded-2xl" iconSize={22} />}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-tinta leading-snug">{l.titulo}</div>
                {l.detalle && <div className="text-[13px] text-texto-secundario leading-snug">{l.detalle}</div>}
                {l.problema ? (
                  <div className="text-[13px] text-terracota font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle size={13} /> {l.problema}
                  </div>
                ) : (
                  <div className="text-[13px] text-ocre font-semibold">{soles(l.precioUnit * l.cantidad)}</div>
                )}
              </div>
              <Stepper cantidad={l.cantidad} onCambiar={l.onCambiar} nombre={l.titulo} />
            </div>
          </m.div>
        ))}
      </AnimatePresence>
      <div className="flex items-center justify-between px-4 py-3.5 bg-crema/70">
        <span className="text-[15px] text-texto-secundario font-medium">Total</span>
        <m.span key={total} initial={{ scale: 1.15, color: "#a93a25" }} animate={{ scale: 1, color: "#C1452D" }} className="font-mono text-[19px] font-semibold">
          {soles(total)}
        </m.span>
      </div>
    </div>
  );
}
