// src/components/client/ClientView.jsx
import React, { useState, useMemo } from "react";
import { AlertCircle, Loader2, ChevronDown, PackageX } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { MenuHero } from "./MenuHero";
import { TarjetaEntrada, TarjetaSegundo, FilaExtra, Paso } from "./Tarjetas";
import { ResumenPedido } from "./ResumenPedido";
import { OrderConfirmation } from "./OrderConfirmation";
import { Field, SelectCard, inputStyle } from "../ui";
import { PAY_LABELS, soles } from "../../utils/pedidos";
import { WHATSAPP_URL } from "../../utils/contacto";
import { fotoDePlato } from "../../lib/catalogo";
import { Store, MapPin, MessageCircle } from "lucide-react";

const CLAVE_CLIENTE = "cm_cliente";

function leerDatosCliente() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CLIENTE) || "{}");
  } catch {
    return {};
  }
}
function guardarDatosCliente(d) {
  try {
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(d));
  } catch {
    /* modo incógnito */
  }
}

let contadorId = 0;
const nuevoId = () => `m${Date.now()}_${contadorId++}`;

export function ClientView() {
  const { menuHoy, handleOrderSubmit, submitting, justSubmitted, setJustSubmitted, abrirAdmin } = useApp();
  const [guardados] = useState(leerDatosCliente);

  // ---------- Selección en construcción (antes de "Agregar al pedido") ----------
  const [entradaElegida, setEntradaElegida] = useState(null); // item.id o "sin"
  const [segundoElegido, setSegundoElegido] = useState(null); // item.id
  const [proteinaElegida, setProteinaElegida] = useState("");
  const [arrozElegido, setArrozElegido] = useState("con");

  // ---------- Carrito ----------
  const [menus, setMenus] = useState([]); // [{id, entrada:{item,plato}|null, segundo:{item,plato}, proteina, arroz}]
  const [entradasExtra, setEntradasExtra] = useState({}); // itemId -> cantidad
  const [extras, setExtras] = useState({}); // itemId -> cantidad

  // ---------- Datos y entrega ----------
  const [nombre, setNombre] = useState(guardados.nombre || "");
  const [telefono, setTelefono] = useState(guardados.telefono || "");
  const [modo, setModo] = useState(guardados.modo || "recojo");
  const [direccion, setDireccion] = useState(guardados.direccion || "");
  const [pago, setPago] = useState("fiado");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");

  const disponibles = (lista) => lista.filter((x) => !x.item.agotado);
  const entradasDisp = disponibles(menuHoy.entradas);
  const segundosDisp = disponibles(menuHoy.segundos);
  const extrasDisp = disponibles(menuHoy.extras);
  const dia = menuHoy.dia;

  const segundoActual = segundosDisp.find((x) => x.item.id === segundoElegido);

  const elegirSegundo = (id) => {
    setSegundoElegido((prev) => (prev === id ? null : id));
    setProteinaElegida("");
    setArrozElegido("con");
  };

  const puedeAgregar =
    !!segundoActual &&
    (!segundoActual.plato.requiereProteina || !!proteinaElegida);

  const agregarMenu = () => {
    if (!puedeAgregar) return;
    const entrada = entradaElegida && entradaElegida !== "sin" ? entradasDisp.find((x) => x.item.id === entradaElegida) : null;
    setMenus((prev) => [
      ...prev,
      {
        id: nuevoId(),
        entrada: entrada || null,
        segundo: segundoActual,
        proteina: segundoActual.plato.requiereProteina ? proteinaElegida : "",
        arroz: segundoActual.plato.permiteArroz ? arrozElegido : null,
      },
    ]);
    setSegundoElegido(null);
    setProteinaElegida("");
    document.getElementById("resumen-flotante")?.classList.add("animate-pop");
  };

  const repetirUltimo = () => {
    if (menus.length === 0) return;
    const u = menus[menus.length - 1];
    setMenus((prev) => [...prev, { ...u, id: nuevoId() }]);
  };

  const cambiarEntradaExtra = (id, d) =>
    setEntradasExtra((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + d) }));
  const cambiarExtra = (id, d) => setExtras((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + d) }));

  // ---------- Totales ----------
  const precioMenu = modo === "delivery" ? dia?.precioDelivery ?? 0 : dia?.precioRecojo ?? 0;
  const totalEntradasExtra = Object.values(entradasExtra).reduce((a, b) => a + b, 0);
  const totalMenus = menus.length;
  const totalPagar =
    totalMenus * precioMenu +
    totalEntradasExtra * (dia?.precioEntradaExtra ?? 0) +
    extrasDisp.reduce((acc, x) => acc + (extras[x.item.id] || 0) * x.plato.precioExtra, 0);

  const hayAlgo = totalMenus > 0 || totalEntradasExtra > 0 || Object.values(extras).some((q) => q > 0);

  // ---------- Líneas del resumen ----------
  const lineasResumen = useMemo(() => {
    const porMenu = {};
    menus.forEach((m) => {
      const key = `${m.segundo.plato.id}|${m.proteina}|${m.arroz}|${m.entrada?.plato.id || ""}`;
      if (!porMenu[key]) porMenu[key] = { ...m, cantidad: 0 };
      porMenu[key].cantidad++;
    });
    const lineas = Object.entries(porMenu).map(([key, m]) => {
      const detalles = [m.proteina, m.entrada ? `+ ${m.entrada.plato.nombre.trim()}` : null, m.arroz === "sin" ? "sin arroz" : null].filter(Boolean);
      return {
        key: "menu-" + key,
        plato: m.segundo.plato,
        foto: fotoDePlato(m.segundo.plato, m.proteina),
        titulo: m.segundo.plato.nombre.trim(),
        detalle: detalles.join(" · "),
        precioUnit: precioMenu,
        cantidad: m.cantidad,
        onCambiar: (d) => {
          if (d > 0) setMenus((prev) => [...prev, { ...m, id: nuevoId() }]);
          else
            setMenus((prev) => {
              const idx = prev.findIndex(
                (x) => x.segundo.plato.id === m.segundo.plato.id && x.proteina === m.proteina && x.arroz === m.arroz && (x.entrada?.plato.id || "") === (m.entrada?.plato.id || "")
              );
              return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
            });
        },
      };
    });
    entradasDisp.forEach((x) => {
      const cant = entradasExtra[x.item.id] || 0;
      if (cant > 0)
        lineas.push({
          key: "entx-" + x.item.id,
          plato: x.plato,
          titulo: x.plato.nombre.trim(),
          detalle: "Entrada extra",
          precioUnit: dia?.precioEntradaExtra ?? 0,
          cantidad: cant,
          onCambiar: (d) => cambiarEntradaExtra(x.item.id, d),
        });
    });
    extrasDisp.forEach((x) => {
      const cant = extras[x.item.id] || 0;
      if (cant > 0)
        lineas.push({
          key: "ex-" + x.item.id,
          plato: x.plato,
          titulo: x.plato.nombre.trim(),
          precioUnit: x.plato.precioExtra,
          cantidad: cant,
          onCambiar: (d) => cambiarExtra(x.item.id, d),
        });
    });
    return lineas;
  }, [menus, entradasExtra, extras, precioMenu, dia, entradasDisp, extrasDisp]);

  const handleSubmit = () => {
    if (!hayAlgo) return setError("Elige al menos un plato, entrada o extra.");
    if (!nombre.trim()) return setError("Falta tu nombre.");
    if (!telefono.trim()) return setError("Falta tu número de WhatsApp.");
    if (modo === "delivery" && !direccion.trim()) return setError("Falta la dirección de entrega.");
    setError("");

    const fondos = [];
    const porCombo = {};
    menus.forEach((m) => {
      const key = `${m.segundo.plato.id}|${m.proteina}|${m.arroz}|${m.entrada?.plato.id || ""}`;
      if (!porCombo[key]) porCombo[key] = { ...m, cantidad: 0 };
      porCombo[key].cantidad++;
    });
    Object.values(porCombo).forEach((m) => {
      fondos.push({
        platoId: m.segundo.plato.id,
        nombre: m.segundo.plato.nombre.trim(),
        cantidad: m.cantidad,
        ...(m.proteina ? { proteina: m.proteina } : {}),
        ...(m.arroz ? { arroz: m.arroz } : {}),
        ...(m.entrada ? { entradaId: m.entrada.plato.id, entradaIncluida: m.entrada.plato.nombre.trim() } : {}),
      });
    });

    const entradasIncluidasConteo = {};
    menus.forEach((m) => {
      if (m.entrada) entradasIncluidasConteo[m.entrada.plato.id] = (entradasIncluidasConteo[m.entrada.plato.id] || 0) + 1;
    });
    const entradas = entradasDisp
      .map((x) => {
        const incluidas = entradasIncluidasConteo[x.plato.id] || 0;
        const extra = entradasExtra[x.item.id] || 0;
        const cantidad = incluidas + extra;
        return cantidad > 0 ? { platoId: x.plato.id, nombre: x.plato.nombre.trim(), cantidad } : null;
      })
      .filter(Boolean);

    const adicionales = extrasDisp
      .map((x) => {
        const cantidad = extras[x.item.id] || 0;
        return cantidad > 0 ? { platoId: x.plato.id, nombre: x.plato.nombre.trim(), cantidad, precio: x.plato.precioExtra } : null;
      })
      .filter(Boolean);

    guardarDatosCliente({ nombre: nombre.trim(), telefono: telefono.trim(), modo, direccion: direccion.trim() });

    handleOrderSubmit({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      fondos,
      entradas,
      adicionales,
      modo,
      direccion: modo === "delivery" ? direccion.trim() : "",
      pago,
      notas: notas.trim(),
      fecha: menuHoy.fecha,
      formato: 2,
    });
  };

  if (justSubmitted) {
    return (
      <OrderConfirmation
        menuHoy={menuHoy}
        justSubmitted={justSubmitted}
        onReset={() => {
          setJustSubmitted(null);
          setMenus([]);
          setEntradasExtra({});
          setExtras({});
          setNotas("");
        }}
      />
    );
  }

  if (!dia || menuHoy.total === 0) {
    return (
      <div className="min-h-screen bg-crema flex flex-col">
        <MenuHero menuHoy={menuHoy} onAdmin={abrirAdmin} />
        <main className="max-w-md mx-auto px-5 -mt-8 relative z-10 flex-1 w-full">
          <div className="bg-white rounded-2xl shadow-floating border border-[#eee2cb] p-7 text-center">
            <PackageX size={34} className="mx-auto mb-3 text-arena-hover" />
            <h2 className="font-display text-xl text-tinta mb-1.5">Hoy no hay menú publicado</h2>
            <p className="text-texto-secundario text-[14.5px] leading-relaxed mb-4">
              Escríbenos por WhatsApp y te contamos qué hay para almorzar.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta inline-flex items-center gap-2 bg-terracota hover:bg-terracota-oscura text-white font-medium rounded-xl px-5 py-3 text-[14.5px]"
            >
              <MessageCircle size={17} /> Escribir por WhatsApp
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-crema ${hayAlgo ? "pb-28" : "pb-10"}`}>
      <MenuHero menuHoy={menuHoy} onAdmin={abrirAdmin} />

      <main className="max-w-md mx-auto px-5 -mt-8 relative z-10">
        {/* Paso 1: recojo o delivery (define el precio de cada menú) */}
        <Paso numero={1} titulo="¿Recojo o delivery?" ayuda="El precio del menú depende de esto." id="paso-modo">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: "recojo", texto: "Recojo en local", Icono: Store, precio: dia.precioRecojo },
              { id: "delivery", texto: "Delivery", Icono: MapPin, precio: dia.precioDelivery },
            ].map(({ id, texto, Icono, precio }) => {
              const activo = modo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setModo(id)}
                  aria-pressed={activo}
                  className={`rounded-2xl border-2 bg-white px-3 py-3.5 flex flex-col items-center gap-1 transition active:scale-[0.98] ${
                    activo ? "border-terracota shadow-active" : "border-transparent shadow-card"
                  }`}
                >
                  <Icono size={20} className={activo ? "text-terracota" : "text-texto-terciario"} />
                  <span className={`text-[14px] ${activo ? "font-semibold text-tinta" : "font-medium text-texto-secundario"}`}>{texto}</span>
                  <span className={`font-mono text-[13px] ${activo ? "text-terracota font-semibold" : "text-texto-terciario"}`}>
                    {soles(precio)} el menú
                  </span>
                </button>
              );
            })}
          </div>
          {modo === "delivery" && (
            <p className="text-[12.5px] text-texto-terciario mt-2 ml-1 animate-fade">Te pedimos la dirección al final, junto con tus datos.</p>
          )}
        </Paso>

        {/* Paso 2: entrada */}
        {entradasDisp.length > 0 && (
          <Paso numero={2} titulo="Elige tu entrada" ayuda="Va incluida gratis con tu plato de fondo." id="paso-entrada">
            <div className="grid grid-cols-2 gap-2.5">
              {entradasDisp.map((x) => (
                <TarjetaEntrada
                  key={x.item.id}
                  plato={x.plato}
                  agotado={x.item.agotado}
                  activo={entradaElegida === x.item.id}
                  onClick={() => setEntradaElegida(entradaElegida === x.item.id ? null : x.item.id)}
                />
              ))}
              <button
                type="button"
                onClick={() => setEntradaElegida(entradaElegida === "sin" ? null : "sin")}
                aria-pressed={entradaElegida === "sin"}
                className={`rounded-2xl border-2 border-dashed flex items-center justify-center text-[13.5px] font-medium px-3 py-6 transition ${
                  entradaElegida === "sin" ? "border-terracota text-terracota bg-white" : "border-arena-oscura text-texto-terciario"
                }`}
              >
                Sin entrada
              </button>
            </div>
          </Paso>
        )}

        {/* Paso 3: segundo */}
        <Paso
          numero={entradasDisp.length > 0 ? 3 : 2}
          titulo="Elige tu plato de fondo"
          ayuda="Toca un plato para ver sus opciones."
          id="paso-segundo"
        >
          <div className="space-y-2.5">
            {segundosDisp.map((x) => (
              <TarjetaSegundo
                key={x.item.id}
                plato={x.plato}
                item={x.item}
                agotado={x.item.agotado}
                activo={segundoElegido === x.item.id}
                onClick={() => elegirSegundo(x.item.id)}
                proteina={proteinaElegida}
                onProteina={setProteinaElegida}
                arroz={arrozElegido}
                onArroz={setArrozElegido}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={agregarMenu}
            disabled={!puedeAgregar}
            className="btn-cta w-full mt-3.5 bg-terracota disabled:bg-arena-hover disabled:shadow-none hover:bg-terracota-oscura disabled:text-texto-terciario text-white font-semibold rounded-xl py-3 text-[14.5px] transition"
          >
            {segundoActual
              ? `Agregar al pedido${precioMenu ? ` · ${soles(precioMenu)}` : ""}${modo === "delivery" ? " (delivery)" : ""}`
              : "Elige un plato arriba"}
          </button>
        </Paso>

        {/* Lo que ya agregó */}
        {menus.length > 0 && (
          <div className="mb-8 -mt-3">
            <button
              type="button"
              onClick={repetirUltimo}
              className="text-[13px] text-terracota font-medium mb-2 inline-flex items-center gap-1"
            >
              + Agregar otro igual al último
            </button>
          </div>
        )}

        {/* Paso 4: extras */}
        {extrasDisp.length > 0 && (
          <Paso numero={(entradasDisp.length > 0 ? 1 : 0) + 3} titulo="¿Algo más?" ayuda="Postres, bebidas y adicionales, cada uno aparte." id="paso-extras">
            <div className="space-y-2">
              {extrasDisp.map((x) => (
                <FilaExtra
                  key={x.item.id}
                  plato={x.plato}
                  precio={x.plato.precioExtra}
                  agotado={x.item.agotado}
                  cantidad={extras[x.item.id] || 0}
                  onCambiar={(d) => cambiarExtra(x.item.id, d)}
                />
              ))}
            </div>
          </Paso>
        )}

        {entradasDisp.length > 0 && (
          <details className="mb-8 group">
            <summary className="list-none flex items-center gap-1.5 text-[13.5px] text-texto-secundario font-medium cursor-pointer select-none">
              <ChevronDown size={15} className="transition group-open:rotate-180" />
              ¿Quieres una entrada extra? (+{soles(dia.precioEntradaExtra)} cada una)
            </summary>
            <div className="space-y-2 mt-2.5">
              {entradasDisp.map((x) => (
                <FilaExtra
                  key={x.item.id}
                  plato={x.plato}
                  precio={dia.precioEntradaExtra}
                  agotado={x.item.agotado}
                  cantidad={entradasExtra[x.item.id] || 0}
                  onCambiar={(d) => cambiarEntradaExtra(x.item.id, d)}
                />
              ))}
            </div>
          </details>
        )}

        {/* Resumen */}
        {hayAlgo && (
          <div id="resumen-flotante" className="mb-8">
            <h2 className="font-display text-[1.2rem] text-tinta mb-3">Tu pedido</h2>
            <ResumenPedido lineas={lineasResumen} total={totalPagar} />
          </div>
        )}

        {/* Entrega, pago y datos */}
        <div className="space-y-5">
          {modo === "delivery" && (
            <Field label="Dirección de entrega">
              <input className={inputStyle} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Jr. Las Flores 123, dpto 4" />
            </Field>
          )}

          <Field label="¿Cómo vas a pagar?">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PAY_LABELS).map(([key, label]) => (
                <SelectCard key={key} active={pago === key} onClick={() => setPago(key)} text={label} compact />
              ))}
            </div>
          </Field>

          <Field label="Tu nombre">
            <input className={inputStyle} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
          </Field>

          <Field label="Tu WhatsApp">
            <input className={inputStyle} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="999 999 999" inputMode="tel" />
          </Field>

          <Field label="Notas (opcional)">
            <input className={inputStyle} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Sin cebolla, poca sal, etc." />
          </Field>

          {error && (
            <div className="flex items-center gap-2 text-terracota text-sm bg-terracota/8 rounded-lg px-3 py-2.5">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!hayAlgo && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-cta w-full bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white font-medium rounded-xl py-3.5 text-[15px]"
            >
              Enviar mi pedido
            </button>
          )}
        </div>
      </main>

      {hayAlgo && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-tinta-oscura border-t border-[#463f33] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-mono text-[11px] text-[#cfc3ad] uppercase tracking-wide">Total</div>
              <div className="font-mono text-dorado text-lg font-semibold">{soles(totalPagar)}</div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white font-medium rounded-xl px-6 py-3 text-[15px] flex items-center justify-center gap-2 shrink-0"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
              {submitting ? "Enviando…" : "Enviar mi pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
