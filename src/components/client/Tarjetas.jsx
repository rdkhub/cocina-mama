// src/components/client/Tarjetas.jsx
// Tarjetas con foto para el menú del cliente.
import React, { useRef, useState } from "react";
import { Check, Minus, Plus, Ban } from "lucide-react";
import { FotoPlato } from "../ui";
import { soles } from "../../utils/pedidos";

function SelloAgotado() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-crema/55 rounded-[inherit]">
      <span className="flex items-center gap-1 bg-tinta text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
        <Ban size={12} /> Agotado
      </span>
    </div>
  );
}

function Marca({ activo }) {
  return (
    <span
      className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border-2 transition ${
        activo ? "bg-terracota border-terracota text-white scale-100" : "bg-white/85 border-white text-transparent"
      }`}
    >
      <Check size={16} strokeWidth={3} />
    </span>
  );
}

function usePop() {
  const [pop, setPop] = useState(false);
  return [pop, () => setPop(true), () => setPop(false)];
}

// Entrada: tarjeta cuadrada en grilla de 2 columnas.
export function TarjetaEntrada({ plato, agotado, activo, onClick }) {
  const [pop, lanzar, fin] = usePop();
  return (
    <button
      type="button"
      disabled={agotado}
      onClick={() => {
        onClick();
        lanzar();
      }}
      onAnimationEnd={fin}
      aria-pressed={activo}
      className={`relative text-left rounded-2xl bg-white border-2 overflow-hidden transition ${
        activo ? "border-terracota shadow-active" : "border-transparent shadow-card"
      } ${agotado ? "opacity-70" : "active:scale-[0.98]"} ${pop ? "animate-pop" : ""}`}
    >
      <div className={`relative ${agotado ? "grayscale" : ""}`}>
        <FotoPlato plato={plato} rounded="rounded-none" className="w-full aspect-[4/3]" />
        {!agotado && <Marca activo={activo} />}
      </div>
      <div className="px-3 py-2.5">
        <div className={`text-[14px] leading-snug ${activo ? "font-semibold text-tinta" : "font-medium text-tinta"}`}>{plato.nombre}</div>
        {plato.descripcion && <div className="text-[12px] text-texto-terciario leading-snug mt-0.5 line-clamp-2">{plato.descripcion}</div>}
      </div>
      {agotado && <SelloAgotado />}
    </button>
  );
}

// Segundo: tarjeta ancha. Al elegirla se despliegan las opciones (proteína, arroz).
export function TarjetaSegundo({ plato, item, agotado, activo, onClick, proteina, onProteina, arroz, onArroz }) {
  const [pop, lanzar, fin] = usePop();
  const opciones = plato.requiereProteina ? item.proteinas : [];
  return (
    <div
      onAnimationEnd={fin}
      className={`relative rounded-2xl bg-white border-2 overflow-hidden transition ${
        activo ? "border-terracota shadow-active" : "border-transparent shadow-card"
      } ${pop ? "animate-pop" : ""}`}
    >
      <button
        type="button"
        disabled={agotado}
        onClick={() => {
          onClick();
          lanzar();
        }}
        aria-pressed={activo}
        className={`w-full flex items-stretch text-left ${agotado ? "" : "active:bg-crema-hover"}`}
      >
        <div className={`relative shrink-0 ${agotado ? "grayscale" : ""}`}>
          <FotoPlato plato={plato} rounded="rounded-none" className="w-28 h-28" iconSize={36} />
        </div>
        <div className="flex-1 min-w-0 px-3.5 py-3 flex flex-col justify-center">
          <div className="text-[15px] font-semibold text-tinta leading-snug">{plato.nombre}</div>
          {plato.descripcion && <div className="text-[12.5px] text-texto-terciario leading-snug mt-0.5 line-clamp-2">{plato.descripcion}</div>}
          {opciones.length > 0 && !activo && (
            <div className="text-[12.5px] text-ocre mt-1 line-clamp-1">Con {opciones.join(" o ")}</div>
          )}
        </div>
        {!agotado && (
          <div className="pr-3 flex items-center">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                activo ? "bg-terracota border-terracota text-white" : "border-arena-oscura text-transparent"
              }`}
            >
              <Check size={16} strokeWidth={3} />
            </span>
          </div>
        )}
      </button>

      {activo && (opciones.length > 0 || plato.permiteArroz) && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-3 animate-fade">
          {opciones.length > 0 && (
            <div>
              <div className="text-[13px] font-medium text-etiqueta mb-1.5">¿Con qué lo quieres?</div>
              <div className="flex flex-wrap gap-2">
                {opciones.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onProteina(p)}
                    aria-pressed={proteina === p}
                    className={`px-3.5 py-2 rounded-full text-[14px] border-2 transition active:scale-95 ${
                      proteina === p ? "bg-terracota border-terracota text-white font-semibold" : "bg-white border-arena text-texto-inactivo"
                    } ${!proteina ? "animate-brilla" : ""}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {plato.permiteArroz && (
            <div>
              <div className="text-[13px] font-medium text-etiqueta mb-1.5">¿Con arroz?</div>
              <div className="flex gap-2">
                {[
                  ["con", "Con arroz"],
                  ["sin", "Sin arroz"],
                ].map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onArroz(v)}
                    aria-pressed={arroz === v}
                    className={`px-3.5 py-2 rounded-full text-[14px] border-2 transition active:scale-95 ${
                      arroz === v ? "bg-salvia border-salvia text-white font-semibold" : "bg-white border-arena text-texto-inactivo"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {agotado && <SelloAgotado />}
    </div>
  );
}

// Fila de extra (postre, bebida, adicional o entrada suelta) con cantidad.
export function FilaExtra({ plato, precio, agotado, cantidad, onCambiar }) {
  const ultimo = useRef(0);
  const [pop, lanzar, fin] = usePop();
  const cambiar = (d) => {
    const ahora = Date.now();
    if (ahora - ultimo.current < 220) return; // evita doble toque accidental
    ultimo.current = ahora;
    onCambiar(d);
    lanzar();
  };
  const activo = cantidad > 0;
  return (
    <div
      onAnimationEnd={fin}
      className={`relative flex items-center gap-3 rounded-2xl bg-white border-2 p-2 pr-3 transition ${
        activo ? "border-terracota shadow-active" : "border-transparent shadow-card"
      } ${pop ? "animate-pop" : ""}`}
    >
      <div className={agotado ? "grayscale" : ""}>
        <FotoPlato plato={plato} className="w-14 h-14" iconSize={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] leading-snug ${activo ? "font-semibold text-tinta" : "font-medium text-tinta"}`}>{plato.nombre}</div>
        <div className="text-[12.5px] text-ocre font-medium">+ {soles(precio)}</div>
      </div>
      {agotado ? (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-texto-terciario">Agotado</span>
      ) : (
        <div className="flex items-center gap-2.5 shrink-0">
          {activo && (
            <>
              <button
                type="button"
                onClick={() => cambiar(-1)}
                aria-label={`Quitar un ${plato.nombre}`}
                style={{ touchAction: "manipulation" }}
                className="w-9 h-9 rounded-full border border-arena-oscura text-texto-secundario flex items-center justify-center active:bg-divisor"
              >
                <Minus size={15} />
              </button>
              <span className="w-4 text-center text-[15px] font-semibold text-terracota">{cantidad}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => cambiar(1)}
            aria-label={`Agregar ${plato.nombre}`}
            style={{ touchAction: "manipulation" }}
            className="w-9 h-9 rounded-full bg-terracota text-white flex items-center justify-center active:bg-terracota-oscura"
          >
            <Plus size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// Encabezado de cada paso: número grande + título + ayuda corta.
export function Paso({ numero, titulo, ayuda, id, children, listo }) {
  return (
    <section id={id} className="scroll-mt-4 mb-8">
      <div className="flex items-center gap-3 mb-1">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 transition ${
            listo ? "bg-salvia text-white" : "bg-tinta text-crema"
          }`}
        >
          {listo ? <Check size={17} strokeWidth={3} /> : numero}
        </span>
        <h2 className="font-display text-[1.35rem] text-tinta leading-tight">{titulo}</h2>
      </div>
      {ayuda && <p className="text-[13.5px] text-texto-secundario mb-3.5 ml-11">{ayuda}</p>}
      {children}
    </section>
  );
}
