// src/components/client/Tarjetas.jsx
// Tarjetas con foto para el menú del cliente. Se "hunden" al tocarlas,
// vibran un poquito en Android y la elegida flota con un check animado.
import { useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { Check, Minus, Plus, Ban } from "lucide-react";
import { FotoPlato, vibrar } from "../ui";
import { soles } from "../../utils/pedidos";
import { fotoDePlato } from "../../lib/catalogo";
import { mamaLleva } from "../../lib/mamaGuia";

const resorte = { type: "spring", stiffness: 520, damping: 30 };

function SelloAgotado() {
  return (
    <span className="inline-flex items-center gap-1 bg-tinta text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1.5 self-start">
      <Ban size={12} /> Agotado hoy
    </span>
  );
}

// Círculo con check que aparece con rebote al elegir.
export function Check3D({ activo, size = 28 }) {
  return (
    <span
      className={`rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${
        activo ? "bg-terracota border-terracota" : "bg-white/90 border-arena-oscura"
      }`}
      style={{ width: size, height: size }}
    >
      <AnimatePresence>
        {activo && (
          <m.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={resorte} className="text-white flex">
            <Check size={size * 0.57} strokeWidth={3.2} />
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// Botón redondo tipo "chip" para opciones (proteína, arroz, entrada).
export function Chip({ activo, onClick, children, tono = "terracota", llamativo }) {
  const colores = {
    terracota: "bg-terracota border-terracota text-white",
    salvia: "bg-salvia border-salvia text-white",
  };
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        vibrar();
        onClick();
      }}
      aria-pressed={activo}
      className={`px-4 py-2.5 rounded-full text-[14.5px] border-2 transition-colors ${
        activo ? `${colores[tono]} font-semibold shadow-active` : "bg-white border-arena text-texto-inactivo"
      } ${llamativo ? "animate-brilla" : ""}`}
    >
      {children}
    </m.button>
  );
}

function Opciones({ titulo, children }) {
  return (
    <div>
      <div className="text-[13.5px] font-semibold text-etiqueta mb-2">{titulo}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// Plato de fondo: tarjeta ancha. Al elegirla se despliegan las opciones
// (proteína, arroz y entrada incluida) y el botón para agregarlo al pedido.
export function TarjetaSegundo({
  plato,
  item,
  agotado,
  activo,
  onClick,
  proteina,
  onProteina,
  arroz,
  onArroz,
  entradas,
  entrada,
  onEntrada,
  precio,
  puedeAgregar,
  falta,
  onAgregar,
}) {
  const opciones = plato.requiereProteina ? item.proteinas : [];
  const fotoProteina = activo && proteina ? plato.fotosProteina?.[proteina]?.url : "";
  return (
    <m.div
      animate={{ y: activo ? -2 : 0 }}
      transition={resorte}
      className={`relative rounded-[22px] border-2 overflow-hidden transition-[background-color,border-color,box-shadow] duration-200 ${
        activo ? "border-terracota bg-terracota-suave shadow-elegida" : "border-transparent bg-white shadow-card"
      } ${agotado ? "opacity-80" : ""}`}
    >
      <m.button
        type="button"
        disabled={agotado}
        whileTap={agotado ? undefined : { scale: 0.975 }}
        onClick={() => {
          vibrar();
          onClick();
        }}
        aria-pressed={activo}
        aria-expanded={activo}
        className="w-full flex items-stretch text-left"
      >
        <div className={`relative shrink-0 ${agotado ? "grayscale" : ""}`}>
          <FotoPlato plato={plato} src={fotoDePlato(plato, activo ? proteina : "")} rounded="rounded-none" className="w-32 h-32" iconSize={40} />
          {fotoProteina && (
            <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate bg-tinta/80 text-white text-[11px] font-semibold rounded-md px-1.5 py-0.5 text-center animate-fade">
              {proteina}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center">
          <div className={`text-[16px] font-semibold leading-snug ${agotado ? "text-texto-terciario" : "text-tinta"}`}>{plato.nombre}</div>
          {agotado && <SelloAgotado />}
          {plato.descripcion && <div className="text-[13px] text-texto-terciario leading-snug mt-0.5 line-clamp-2">{plato.descripcion}</div>}
          {opciones.length > 0 && !activo && !agotado && <div className="text-[13px] text-ocre font-medium mt-1 line-clamp-1">Con {opciones.join(" o ")}</div>}
          {!agotado && !activo && <div className="font-mono text-[13px] text-terracota font-semibold mt-1">{soles(precio)}</div>}
        </div>
        {!agotado && (
          <div className="pr-3.5 flex items-center">
            <Check3D activo={activo} />
          </div>
        )}
      </m.button>

      <AnimatePresence initial={false}>
        {activo && (
          <m.div
            key="opciones"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-1.5 space-y-3.5">
              {opciones.length > 0 && (
                <Opciones titulo="¿Con qué lo quieres?">
                  {opciones.map((p) => (
                    <Chip key={p} activo={proteina === p} onClick={() => onProteina(p)} llamativo={!proteina}>
                      {p}
                    </Chip>
                  ))}
                </Opciones>
              )}
              {entradas.length > 0 && (
                <Opciones titulo="Entrada (va incluida)">
                  {entradas.map((e) => (
                    <Chip key={e.item.id} activo={entrada === e.item.id} onClick={() => onEntrada(e.item.id)} tono="salvia" llamativo={!entrada}>
                      {e.plato.nombre}
                    </Chip>
                  ))}
                  <Chip activo={entrada === "sin"} onClick={() => onEntrada("sin")} tono="salvia" llamativo={!entrada}>
                    Sin entrada
                  </Chip>
                </Opciones>
              )}
              {plato.permiteArroz && (
                <Opciones titulo="¿Con arroz?">
                  <Chip activo={arroz === "con"} onClick={() => onArroz("con")} tono="salvia">
                    Con arroz
                  </Chip>
                  <Chip activo={arroz === "sin"} onClick={() => onArroz("sin")} tono="salvia">
                    Sin arroz
                  </Chip>
                </Opciones>
              )}
              <m.button
                type="button"
                whileTap={puedeAgregar ? { scale: 0.97 } : undefined}
                data-mama-lleva
                onClick={(e) => {
                  if (puedeAgregar) mamaLleva(e.currentTarget, plato.nombre);
                  onAgregar();
                }}
                className={`w-full rounded-2xl py-3.5 text-[15.5px] font-semibold flex items-center justify-center gap-2 transition-colors ${
                  puedeAgregar ? "btn-cta bg-terracota text-white" : "bg-arena text-texto-secundario"
                }`}
              >
                {puedeAgregar ? (
                  <>
                    <Plus size={18} strokeWidth={2.6} /> Agregar a mi pedido · {soles(precio)}
                  </>
                ) : (
                  falta
                )}
              </m.button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}

// Fila de extra (postre, bebida, adicional o entrada suelta) con cantidad.
export function FilaExtra({ plato, precio, agotado, cantidad, onCambiar }) {
  const ultimo = useRef(0);
  const cambiar = (d) => {
    const ahora = Date.now();
    if (ahora - ultimo.current < 220) return; // evita doble toque accidental
    ultimo.current = ahora;
    vibrar();
    onCambiar(d);
  };
  const activo = cantidad > 0;
  return (
    <div
      className={`relative flex items-center gap-3 rounded-[20px] border-2 p-2 pr-3 transition-[background-color,border-color,box-shadow] duration-200 ${
        activo ? "border-terracota bg-terracota-suave shadow-elegida" : "border-transparent bg-white shadow-card"
      }`}
    >
      <div className={agotado ? "grayscale" : ""}>
        <FotoPlato plato={plato} className="w-16 h-16" rounded="rounded-2xl" iconSize={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${activo ? "font-semibold text-tinta" : "font-medium text-tinta"}`}>{plato.nombre}</div>
        <div className="text-[13px] text-ocre font-semibold">+ {soles(precio)}</div>
      </div>
      {agotado ? (
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-white bg-tinta rounded-full px-2.5 py-1">Agotado</span>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence initial={false}>
            {activo && (
              <m.div
                key="menos"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-2"
              >
                <m.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => cambiar(-1)}
                  aria-label={`Quitar un ${plato.nombre}`}
                  style={{ touchAction: "manipulation" }}
                  className="w-10 h-10 rounded-full border-2 border-arena-oscura bg-white text-texto-secundario flex items-center justify-center"
                >
                  <Minus size={16} />
                </m.button>
                <m.span key={cantidad} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={resorte} className="w-5 text-center text-[16px] font-bold text-terracota">
                  {cantidad}
                </m.span>
              </m.div>
            )}
          </AnimatePresence>
          <m.button
            type="button"
            whileTap={{ scale: 0.85 }}
            data-mama-lleva
            onClick={(e) => {
              mamaLleva(e.currentTarget, plato.nombre);
              cambiar(1);
            }}
            aria-label={`Agregar ${plato.nombre}`}
            style={{ touchAction: "manipulation" }}
            className="w-10 h-10 rounded-full bg-terracota text-white flex items-center justify-center shadow-active"
          >
            <Plus size={17} strokeWidth={2.6} />
          </m.button>
        </div>
      )}
      {agotado && <div className="absolute inset-0 rounded-[inherit] bg-crema/40 pointer-events-none" />}
    </div>
  );
}

// Encabezado de cada paso: número grande + título + ayuda corta. Cuando el
// paso está listo, el número se vuelve un check verde.
export function Paso({ numero, titulo, ayuda, id, children, listo, mama }) {
  return (
    <section id={id} className="scroll-mt-4 mb-9">
      <div className="flex items-center gap-3 mb-1">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 transition-colors duration-300 ${
            listo ? "bg-salvia text-white" : "bg-tinta text-crema"
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span key={listo ? "ok" : "n"} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={resorte} className="flex">
              {listo ? <Check size={18} strokeWidth={3} /> : numero}
            </m.span>
          </AnimatePresence>
        </span>
        <h2 data-mama={mama} className="font-display text-[1.4rem] text-tinta leading-tight">
          {titulo}
        </h2>
      </div>
      {ayuda && <p className="text-[14px] text-texto-secundario mb-4 ml-12">{ayuda}</p>}
      {children}
    </section>
  );
}
