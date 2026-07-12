// src/components/client/ClientView.jsx
import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tag, Field } from "../ui";
import { MenuHero } from "./MenuHero";
import { OrderForm } from "./OrderForm";
import { OrderSummary } from "./OrderSummary";
import { OrderConfirmation } from "./OrderConfirmation";
import { PRECIO_FONDO_RECOJO, PRECIO_FONDO_DELIVERY, PRECIO_ENTRADA_SOLA, calcularTotal } from "../../utils/pedidos";

// ClientView es el "contenedor": guarda TODO el estado del pedido que está
// armando el cliente (qué platos, cantidades, modo de entrega, pago, etc.)
// y las funciones que lo modifican. Los hijos (MenuHero, OrderForm,
// OrderSummary) son presentacionales: solo reciben props y pintan UI.
export function ClientView({ menu, onSubmit, submitting, justSubmitted, onReset }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  // fondoSeleccion[i] = array con un objeto por cada unidad pedida del fondo i.
  // Cada objeto es { proteina, entrada } para ESA unidad ("" si no aplica).
  // Ej: fondoSeleccion[0] = [{proteina:"Milanesa", entrada:"Ensalada de palta"}, {proteina:"Plancha", entrada:""}]
  // significa 2 unidades del fondo 0: una con Milanesa + ensalada de palta, otra con Plancha sin entrada.
  const [fondoSeleccion, setFondoSeleccion] = useState(menu.fondos.map(() => []));
  // arrozElegido[i] = "con" | "sin" | null (null si ese plato no tiene la opción)
  const [arrozElegido, setArrozElegido] = useState(menu.fondos.map((f) => (f.permiteArroz ? "con" : null)));
  // entradaExtraQty[j] = cantidad de entradas SUELTAS (sin asociar a ningún fondo) que el
  // cliente pide de más — estas siempre cuestan S/3 cada una.
  const [entradaExtraQty, setEntradaExtraQty] = useState(menu.entradas.map(() => 0));
  const [adicionalQty, setAdicionalQty] = useState((menu.adicionales || []).map(() => 0));
  const [modo, setModo] = useState("recojo"); // recojo | delivery
  const [direccion, setDireccion] = useState("");
  const [pago, setPago] = useState("fiado"); // yape | efectivo | fiado
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const fondoQty = fondoSeleccion.map((arr) => arr.length);
  const totalFondos = fondoQty.reduce((a, b) => a + b, 0);
  const totalEntradasExtra = entradaExtraQty.reduce((a, b) => a + b, 0);
  const precioFondoUnidad = modo === "delivery" ? PRECIO_FONDO_DELIVERY : PRECIO_FONDO_RECOJO;
  const totalPagar =
    totalFondos * precioFondoUnidad +
    totalEntradasExtra * PRECIO_ENTRADA_SOLA +
    (menu.adicionales || []).reduce((acc, a, i) => acc + adicionalQty[i] * a.precio, 0);

  const bump = (arr, setArr, i, delta) => {
    const copy = [...arr];
    copy[i] = Math.max(0, copy[i] + delta);
    setArr(copy);
  };

  // Lista de opciones de proteína para el fondo i: las suyas propias.
  const opcionesProteina = (i) => {
    const texto = menu.fondos[i]?.proteinas || "";
    return texto
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  };

  // Agrega una unidad del fondo i con la proteína indicada ("" si no aplica). La entrada
  // de esa unidad arranca vacía (el cliente la elige después con elegirEntradaDeUnidad).
  const agregarFondo = (i, proteina) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    copy[i].push({ proteina, entrada: "" });
    setFondoSeleccion(copy);
  };

  // Quita la última unidad agregada del fondo i (o una con proteína específica si se indica)
  const quitarFondo = (i, proteinaEspecifica = null) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    if (proteinaEspecifica !== null) {
      const idx = copy[i].map((u) => u.proteina).lastIndexOf(proteinaEspecifica);
      if (idx !== -1) copy[i].splice(idx, 1);
    } else {
      copy[i].pop();
    }
    setFondoSeleccion(copy);
  };

  // Cuenta cuántas unidades del fondo i tienen una proteína específica
  const contarProteina = (i, proteina) => fondoSeleccion[i].filter((u) => u.proteina === proteina).length;

  // Cambia la entrada elegida de la unidad #unidadIdx del fondo i
  const elegirEntradaDeUnidad = (i, unidadIdx, entrada) => {
    const copy = fondoSeleccion.map((arr) => [...arr]);
    copy[i][unidadIdx] = { ...copy[i][unidadIdx], entrada: copy[i][unidadIdx].entrada === entrada ? "" : entrada };
    setFondoSeleccion(copy);
  };

  const handleSubmit = () => {
    if (!nombre.trim()) return setError("Falta tu nombre.");
    if (!telefono.trim()) return setError("Falta tu número de teléfono.");
    const totalAdicionales = adicionalQty.reduce((a, b) => a + b, 0);
    if (totalFondos === 0 && totalEntradasExtra === 0 && totalAdicionales === 0) {
      return setError("Elige al menos un plato, entrada, bebida o adicional.");
    }
    if (modo === "delivery" && !direccion.trim()) return setError("Falta la dirección de entrega.");
    setError("");

    // Agrupa las unidades de cada fondo por combinación de proteína + entrada elegida,
    // para no repetir una línea por cada unidad individual.
    const fondos = [];
    const entradasIncluidasConteo = {}; // nombre de entrada -> cuántas veces fue elegida junto a un fondo
    menu.fondos.forEach((plato, i) => {
      const seleccion = fondoSeleccion[i];
      if (seleccion.length === 0) return;
      const porCombo = {};
      seleccion.forEach((u) => {
        const key = `${u.proteina || "__sin__"}|||${u.entrada || "__sin__"}`;
        porCombo[key] = (porCombo[key] || 0) + 1;
        if (u.entrada) entradasIncluidasConteo[u.entrada] = (entradasIncluidasConteo[u.entrada] || 0) + 1;
      });
      Object.entries(porCombo).forEach(([key, cantidad]) => {
        const [proteinaKey, entradaKey] = key.split("|||");
        fondos.push({
          nombre: plato.nombre,
          cantidad,
          ...(proteinaKey !== "__sin__" ? { proteina: proteinaKey } : {}),
          ...(entradaKey !== "__sin__" ? { entradaIncluida: entradaKey } : {}),
          ...(plato.permiteArroz ? { arroz: arrozElegido[i] } : {}),
        });
      });
    });

    // El array "entradas" combina las que vinieron incluidas con un fondo (para que
    // queden registradas en el detalle del pedido) y las extra sueltas que el cliente
    // pidió de más. El precio solo cuenta las EXTRA (calcularTotal ya sabe distinguir
    // por cantidad de fondos vs cantidad de entradas total).
    const entradas = menu.entradas
      .map((nombrePlato, i) => {
        const incluidas = entradasIncluidasConteo[nombrePlato] || 0;
        const extra = entradaExtraQty[i] || 0;
        const cantidad = incluidas + extra;
        return cantidad > 0 ? { nombre: nombrePlato, cantidad } : null;
      })
      .filter(Boolean);

    const adicionales = (menu.adicionales || [])
      .map((a, i) => (adicionalQty[i] > 0 ? { nombre: a.nombre, cantidad: adicionalQty[i], precio: a.precio } : null))
      .filter(Boolean);

    onSubmit({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fondos,
      entradas,
      adicionales,
      modo,
      direccion: modo === "delivery" ? direccion.trim() : "",
      pago,
      notas: notas.trim(),
      total: calcularTotal(fondos, entradas, modo, adicionales),
    });
  };

  if (justSubmitted) {
    return <OrderConfirmation menu={menu} justSubmitted={justSubmitted} onReset={onReset} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF6EC] pb-32">
      <MenuHero menu={menu} />

      <div className="max-w-md mx-auto px-5 -mt-7 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(43,38,34,0.08)] border border-[#eee2cb] p-5 mb-7">
          <div className="flex gap-2 flex-wrap">
            <Tag color="#5C7A4F">Puedes pedir varios platos y cantidades</Tag>
          </div>
        </div>

        <h2 className="font-display text-xl text-[#2B2622] mb-3.5">Armar mi pedido</h2>

        <OrderForm
          menu={menu}
          nombre={nombre}
          setNombre={setNombre}
          telefono={telefono}
          setTelefono={setTelefono}
          fondoSeleccion={fondoSeleccion}
          fondoQty={fondoQty}
          arrozElegido={arrozElegido}
          setArrozElegido={setArrozElegido}
          entradaExtraQty={entradaExtraQty}
          setEntradaExtraQty={setEntradaExtraQty}
          adicionalQty={adicionalQty}
          setAdicionalQty={setAdicionalQty}
          modo={modo}
          setModo={setModo}
          direccion={direccion}
          setDireccion={setDireccion}
          pago={pago}
          setPago={setPago}
          notas={notas}
          setNotas={setNotas}
          opcionesProteina={opcionesProteina}
          agregarFondo={agregarFondo}
          quitarFondo={quitarFondo}
          contarProteina={contarProteina}
          elegirEntradaDeUnidad={elegirEntradaDeUnidad}
          bump={bump}
        />

        <div className="space-y-5 mt-5">
          {(totalFondos > 0 || entradaExtraQty.some((q) => q > 0) || adicionalQty.some((q) => q > 0)) && (
            <OrderSummary
              menu={menu}
              fondoSeleccion={fondoSeleccion}
              fondoQty={fondoQty}
              precioFondoUnidad={precioFondoUnidad}
              entradaExtraQty={entradaExtraQty}
              adicionalQty={adicionalQty}
              totalPagar={totalPagar}
              opcionesProteina={opcionesProteina}
              arrozElegido={arrozElegido}
            />
          )}

          {error && (
            <div className="flex items-center gap-2 text-[#C1452D] text-sm bg-[#C1452D]/8 rounded-lg px-3 py-2.5">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#C1452D] hover:bg-[#a93a25] disabled:opacity-60 text-white font-medium rounded-xl py-3.5 text-[15px] transition flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            {submitting ? "Enviando pedido…" : "Enviar mi pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
