// src/components/client/OrderSummary.jsx
import React from "react";

// Tarjeta oscura "Tu pedido" que muestra el desglose en vivo mientras el
// cliente va eligiendo. Recibe los mismos valores derivados que ya calculó
// ClientView (fondoQty, precioFondoUnidad, totalPagar, etc.) para no repetir
// esa lógica de cálculo dos veces.
export function OrderSummary({
  menu,
  fondoSeleccion,
  fondoQty,
  precioFondoUnidad,
  entradaExtraQty,
  adicionalQty,
  totalPagar,
  opcionesProteina,
  arrozElegido,
}) {
  return (
    <div className="bg-gradient-to-b from-[#332A21] to-[#211B16] rounded-2xl p-4 text-[#FBF6EC]">
      <div className="text-[#E0A95C] text-xs uppercase tracking-wide mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        Tu pedido
      </div>
      <div className="space-y-1.5 text-[14px]">
        {/* Cada fondo cuesta lo mismo tenga o no entrada (S/12 recojo, S/13 delivery).
            Si el cliente eligió una entrada para esa unidad, se muestra incluida. */}
        {menu.fondos.map((f, i) => {
          if (fondoQty[i] === 0) return null;
          const opciones = opcionesProteina(i);
          const arrozTexto = f.permiteArroz ? (arrozElegido[i] === "con" ? " (con arroz)" : " (sin arroz)") : "";
          // Agrupa las unidades de este fondo por la entrada que eligieron, para mostrar
          // una línea por combinación (ej: "2 con Ensalada de tomate", "1 sin entrada")
          const conteoPorEntrada = {};
          fondoSeleccion[i].forEach((u) => {
            if (opciones.length > 0) return; // ya se desglosa por proteína más abajo
            const key = u.entrada || "__sin__";
            conteoPorEntrada[key] = (conteoPorEntrada[key] || 0) + 1;
          });

          if (opciones.length === 0) {
            return Object.entries(conteoPorEntrada).map(([key, cant]) => {
              const subtotal = cant * precioFondoUnidad;
              return (
                <div key={"sf" + i + key} className="flex justify-between items-baseline">
                  <span>
                    {f.nombre}{arrozTexto}
                    {key !== "__sin__" && <span className="text-[#cfc3ad]"> + {key}</span>}
                    <span className="text-[#9c9082]"> &middot; {cant} x S/{precioFondoUnidad}</span>
                  </span>
                  <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
                </div>
              );
            });
          }
          // Plato con proteínas: una línea por cada combinación proteína + entrada
          const conteoCombo = {};
          fondoSeleccion[i].forEach((u) => {
            const key = `${u.proteina}|||${u.entrada || "__sin__"}`;
            conteoCombo[key] = (conteoCombo[key] || 0) + 1;
          });
          return Object.entries(conteoCombo).map(([key, cant]) => {
            const [proteina, entradaKey] = key.split("|||");
            const subtotal = cant * precioFondoUnidad;
            return (
              <div key={"sf" + i + key} className="flex justify-between items-baseline">
                <span>
                  {f.nombre}
                  <span className="text-[#cfc3ad]"> — {proteina}{arrozTexto}</span>
                  {entradaKey !== "__sin__" && <span className="text-[#cfc3ad]"> + {entradaKey}</span>}
                  <span className="text-[#9c9082]"> &middot; {cant} x S/{precioFondoUnidad}</span>
                </span>
                <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
              </div>
            );
          });
        })}

        {/* Entradas adicionales: las que el cliente pidió de más, sin asociar a un fondo. */}
        {menu.entradas.map((e, i) => {
          if (entradaExtraQty[i] === 0) return null;
          const subtotal = entradaExtraQty[i] * 3;
          return (
            <div key={"sea" + i} className="flex justify-between items-baseline text-[#cfc3ad]">
              <span>
                {e} (extra)
                <span className="text-[#9c9082]"> &middot; {entradaExtraQty[i]} x S/3</span>
              </span>
              <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
            </div>
          );
        })}

        {(menu.adicionales || []).map((a, i) => {
          if (adicionalQty[i] === 0) return null;
          const subtotal = adicionalQty[i] * a.precio;
          return (
            <div key={"sa" + i} className="flex justify-between items-baseline text-[#cfc3ad]">
              <span>
                {a.nombre}
                <span className="text-[#9c9082]"> &middot; {adicionalQty[i]} x S/{a.precio}</span>
              </span>
              <span className="text-[#E0A95C] font-medium ml-3 shrink-0">S/ {subtotal.toFixed(2)}</span>
            </div>
          );
        })}
        <div className="flex justify-between items-baseline text-[#cfc3ad]">
          <span>Refresco: {menu.bebida}</span>
          <span className="text-[#E0A95C] font-medium ml-3 shrink-0">Incluido</span>
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#463f33]">
        <span className="text-[15px] font-medium">Total a pagar</span>
        <span className="text-[#E0A95C] text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          S/ {totalPagar.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
