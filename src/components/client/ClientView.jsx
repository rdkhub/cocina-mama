// src/components/client/ClientView.jsx
// Página del cliente: 1) recojo o delivery, 2) plato de fondo (con su
// proteína, entrada y arroz), 3) extras, 4) sus datos. Abajo, una barra fija
// muestra cuántos platos lleva y el total, y envía el pedido.
import { useState, useMemo, useEffect, useRef } from "react";
import { iniciarMamaGuia } from "../../lib/mamaGuia";
import { m, AnimatePresence } from "motion/react";
import { AlertCircle, Loader2, ChevronDown, PackageX, ShoppingBag, Store, MapPin, MessageCircle, Send } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { MenuHero } from "./MenuHero";
import { Encuentranos } from "./Encuentranos";
import { TarjetaSegundo, FilaExtra, Paso } from "./Tarjetas";
import { ResumenPedido } from "./ResumenPedido";
import { OrderConfirmation } from "./OrderConfirmation";
import { Field, SelectCard, inputStyle, vibrar, avisar } from "../ui";
import { PAY_LABELS, soles } from "../../utils/pedidos";
import { WHATSAPP_URL } from "../../utils/contacto";
import { fotoDePlato } from "../../lib/catalogo";

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

// Disponibles primero; los agotados se muestran al final, en gris.
const ordenar = (lista) => [...lista.filter((x) => !x.item.agotado), ...lista.filter((x) => x.item.agotado)];

const irA = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });

export function ClientView() {
  const { menuHoy, handleOrderSubmit, submitting, justSubmitted, setJustSubmitted, abrirAdmin } = useApp();
  const [guardados] = useState(leerDatosCliente);

  // ---------- Plato que está eligiendo (antes de "Agregar a mi pedido") ----------
  const [segundoElegido, setSegundoElegido] = useState(null); // item.id
  const [proteinaElegida, setProteinaElegida] = useState("");
  const [entradaElegida, setEntradaElegida] = useState(null); // item.id o "sin"
  const [arrozElegido, setArrozElegido] = useState("con");

  // ---------- Carrito ----------
  const [menus, setMenus] = useState([]); // [{id, entrada:{item,plato}|null, segundo:{item,plato}, proteina, arroz}]
  const [entradasExtra, setEntradasExtra] = useState({}); // itemId -> cantidad
  const [extras, setExtras] = useState({}); // itemId -> cantidad
  const [salto, setSalto] = useState(0); // para animar la barra al agregar

  // ---------- Datos y entrega ----------
  const [nombre, setNombre] = useState(guardados.nombre || "");
  const [telefono, setTelefono] = useState(guardados.telefono || "");
  const [modo, setModo] = useState(guardados.modo || "recojo");
  const [direccion, setDireccion] = useState(guardados.direccion || "");
  const [pago, setPago] = useState(null);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState({ texto: "", campo: "" });

  const disponibles = (lista) => lista.filter((x) => !x.item.agotado);
  const entradasDisp = disponibles(menuHoy.entradas);
  const segundosDisp = disponibles(menuHoy.segundos);
  const extrasDisp = disponibles(menuHoy.extras);
  const dia = menuHoy.dia;

  const segundoActual = segundosDisp.find((x) => x.item.id === segundoElegido);

  // Mamá viva: sube desde el letrero, acompaña al bajar y lleva los platos.
  const raizRef = useRef(null);
  const hayMenu = !!dia && menuHoy.total > 0;
  useEffect(() => {
    if (!raizRef.current || justSubmitted || !hayMenu) return undefined;
    return iniciarMamaGuia(raizRef.current);
  }, [justSubmitted, hayMenu]);

  const elegirSegundo = (id) => {
    setSegundoElegido((prev) => (prev === id ? null : id));
    setProteinaElegida("");
    setArrozElegido("con");
    // Si hoy hay una sola entrada, ya viene elegida.
    setEntradaElegida(entradasDisp.length === 1 ? entradasDisp[0].item.id : null);
  };

  const faltaProteina = !!segundoActual?.plato.requiereProteina && !proteinaElegida;
  const faltaEntrada = entradasDisp.length > 0 && !entradaElegida;
  const puedeAgregar = !!segundoActual && !faltaProteina && !faltaEntrada;
  const textoFalta = faltaProteina ? "Elige con qué lo quieres" : faltaEntrada ? "Elige tu entrada" : "";

  // El plato elegido, armado como una línea del carrito.
  const platoPendiente = () => {
    const entrada = entradaElegida && entradaElegida !== "sin" ? entradasDisp.find((x) => x.item.id === entradaElegida) : null;
    return {
      id: nuevoId(),
      entrada: entrada || null,
      segundo: segundoActual,
      proteina: segundoActual.plato.requiereProteina ? proteinaElegida : "",
      arroz: segundoActual.plato.permiteArroz ? arrozElegido : null,
    };
  };

  const agregarMenu = () => {
    if (!puedeAgregar) {
      vibrar(30);
      return;
    }
    vibrar(15);
    setMenus((prev) => [...prev, platoPendiente()]);
    setSegundoElegido(null);
    setProteinaElegida("");
    setSalto((n) => n + 1);
  };

  const repetirUltimo = () => {
    if (menus.length === 0) return;
    vibrar(15);
    const u = menus[menus.length - 1];
    setMenus((prev) => [...prev, { ...u, id: nuevoId() }]);
    setSalto((n) => n + 1);
  };

  const cambiarEntradaExtra = (id, d) => {
    setEntradasExtra((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + d) }));
    if (d > 0) setSalto((n) => n + 1);
  };
  const cambiarExtra = (id, d) => {
    setExtras((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + d) }));
    if (d > 0) setSalto((n) => n + 1);
  };

  // ---------- Totales ----------
  const precioMenu = modo === "delivery" ? dia?.precioDelivery ?? 0 : dia?.precioRecojo ?? 0;
  const totalEntradasExtra = Object.values(entradasExtra).reduce((a, b) => a + b, 0);
  const totalExtras = Object.values(extras).reduce((a, b) => a + b, 0);
  const calcularTotal = (listaMenus) =>
    listaMenus.length * precioMenu +
    totalEntradasExtra * (dia?.precioEntradaExtra ?? 0) +
    extrasDisp.reduce((acc, x) => acc + (extras[x.item.id] || 0) * x.plato.precioExtra, 0);
  const totalPagar = calcularTotal(menus);
  const totalCosas = menus.length + totalEntradasExtra + totalExtras;
  const hayAlgo = totalCosas > 0;

  // ---------- Líneas del resumen ----------
  const lineasResumen = useMemo(() => {
    const porMenu = {};
    menus.forEach((x) => {
      const key = `${x.segundo.plato.id}|${x.proteina}|${x.arroz}|${x.entrada?.plato.id || ""}`;
      if (!porMenu[key]) porMenu[key] = { ...x, cantidad: 0 };
      porMenu[key].cantidad++;
    });
    const lineas = Object.entries(porMenu).map(([key, x]) => {
      const detalles = [x.proteina, x.entrada ? `+ ${x.entrada.plato.nombre.trim()}` : "sin entrada", x.arroz === "sin" ? "sin arroz" : null].filter(Boolean);
      return {
        key: "menu-" + key,
        plato: x.segundo.plato,
        foto: fotoDePlato(x.segundo.plato, x.proteina),
        titulo: x.segundo.plato.nombre.trim(),
        detalle: detalles.join(" · "),
        precioUnit: precioMenu,
        cantidad: x.cantidad,
        onCambiar: (d) => {
          if (d > 0) setMenus((prev) => [...prev, { ...x, id: nuevoId() }]);
          else
            setMenus((prev) => {
              const idx = prev.findIndex(
                (y) => y.segundo.plato.id === x.segundo.plato.id && y.proteina === x.proteina && y.arroz === x.arroz && (y.entrada?.plato.id || "") === (x.entrada?.plato.id || "")
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menus, entradasExtra, extras, precioMenu, dia, menuHoy]);

  const fallar = (texto, campo) => {
    vibrar(40);
    setError({ texto, campo });
    avisar(texto);
    if (campo) irA(campo);
  };

  const handleSubmit = () => {
    // Si dejó un plato elegido sin tocar "Agregar", se agrega solo.
    let menusFinal = menus;
    if (segundoActual) {
      if (!puedeAgregar) return fallar(`${textoFalta} para tu ${segundoActual.plato.nombre.trim()}.`, "paso-segundo");
      menusFinal = [...menus, platoPendiente()];
      setMenus(menusFinal);
      setSegundoElegido(null);
    }
    const hay = menusFinal.length + totalEntradasExtra + totalExtras > 0;
    if (!hay) return fallar("Elige al menos un plato.", "paso-segundo");
    if (modo === "delivery" && !direccion.trim()) return fallar("Falta la dirección de entrega.", "campo-direccion");
    if (!pago) return fallar("Elige cómo vas a pagar.", "campo-pago");
    if (!nombre.trim()) return fallar("Falta tu nombre.", "campo-nombre");
    if (!telefono.trim()) return fallar("Falta tu número de WhatsApp.", "campo-telefono");
    setError({ texto: "", campo: "" });

    const fondos = [];
    const porCombo = {};
    menusFinal.forEach((x) => {
      const key = `${x.segundo.plato.id}|${x.proteina}|${x.arroz}|${x.entrada?.plato.id || ""}`;
      if (!porCombo[key]) porCombo[key] = { ...x, cantidad: 0 };
      porCombo[key].cantidad++;
    });
    Object.values(porCombo).forEach((x) => {
      fondos.push({
        platoId: x.segundo.plato.id,
        nombre: x.segundo.plato.nombre.trim(),
        cantidad: x.cantidad,
        ...(x.proteina ? { proteina: x.proteina } : {}),
        ...(x.arroz ? { arroz: x.arroz } : {}),
        ...(x.entrada ? { entradaId: x.entrada.plato.id, entradaIncluida: x.entrada.plato.nombre.trim() } : {}),
      });
    });

    const entradasIncluidasConteo = {};
    menusFinal.forEach((x) => {
      if (x.entrada) entradasIncluidasConteo[x.entrada.plato.id] = (entradasIncluidasConteo[x.entrada.plato.id] || 0) + 1;
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
      totalEstimado: calcularTotal(menusFinal),
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
          setPago(null);
        }}
      />
    );
  }

  if (!dia || menuHoy.total === 0) {
    return (
      <div className="min-h-screen bg-crema flex flex-col">
        <MenuHero menuHoy={menuHoy} onAdmin={abrirAdmin} avatar="/mama/mama-cucharon.webp" />
        <main className="max-w-md mx-auto px-5 pt-8 relative z-10 flex-1 w-full">
          <div className="bg-white rounded-3xl shadow-floating border border-[#eee2cb] p-7 text-center mb-8">
            <PackageX size={34} className="mx-auto mb-3 text-arena-hover" />
            <h2 className="font-display text-[1.5rem] text-tinta mb-1.5">Hoy no hay menú publicado</h2>
            <p className="text-texto-secundario text-[15px] leading-relaxed mb-4">Escríbenos por WhatsApp y te contamos qué hay para almorzar.</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta inline-flex items-center gap-2 bg-terracota hover:bg-terracota-oscura text-white font-medium rounded-2xl px-5 py-3 text-[15px]"
            >
              <MessageCircle size={17} /> Escribir por WhatsApp
            </a>
          </div>
          <Encuentranos />
        </main>
      </div>
    );
  }

  // El paso 3 («¿Algo más?») solo aparece si hay extras en el menú; la entrada
  // extra va dentro del paso 2 y no cuenta como paso propio.
  const hayPasoExtras = menuHoy.extras.length > 0;
  const nPaso = { modo: 1, plato: 2, extras: 3, datos: hayPasoExtras ? 4 : 3 };
  const errorEn = (campo) => error.campo === campo;

  return (
    <div ref={raizRef} className={`min-h-screen bg-crema ${hayAlgo ? "pb-32" : "pb-12"}`}>
      <MenuHero menuHoy={menuHoy} onAdmin={abrirAdmin} />

      <main className="max-w-md mx-auto px-5 pt-8">
        {/* Paso 1: recojo o delivery (define el precio de cada menú) */}
        <Paso numero={nPaso.modo} titulo="¿Recojo o delivery?" ayuda="El precio del menú depende de esto." id="paso-modo" listo mama="texto">
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "recojo", texto: "Recojo en local", Icono: Store, precio: dia.precioRecojo },
              { id: "delivery", texto: "Delivery", Icono: MapPin, precio: dia.precioDelivery },
            ].map(({ id, texto, Icono, precio }) => {
              const activo = modo === id;
              return (
                <m.button
                  key={id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    vibrar();
                    setModo(id);
                  }}
                  aria-pressed={activo}
                  className={`rounded-[22px] border-2 px-3 py-4 flex flex-col items-center gap-1 transition-[background-color,border-color,box-shadow] duration-200 ${
                    activo ? "border-terracota bg-terracota-suave shadow-elegida" : "border-transparent bg-white shadow-card"
                  }`}
                >
                  <Icono size={22} className={activo ? "text-terracota" : "text-texto-terciario"} />
                  <span className={`text-[15px] ${activo ? "font-semibold text-tinta" : "font-medium text-texto-secundario"}`}>{texto}</span>
                  <span className={`font-mono text-[13.5px] ${activo ? "text-terracota font-semibold" : "text-texto-terciario"}`}>{soles(precio)} el menú</span>
                </m.button>
              );
            })}
          </div>
          {modo === "delivery" && <p className="text-[13px] text-texto-terciario mt-2.5 ml-1 animate-fade">Te pedimos la dirección al final, junto con tus datos.</p>}
        </Paso>

        {/* Paso 2: plato de fondo, con su proteína, entrada y arroz */}
        <Paso
          numero={nPaso.plato}
          titulo="Elige tu plato"
          ayuda={entradasDisp.length ? "Tócalo para elegir la entrada y las opciones. Cada menú incluye entrada y refresco." : "Tócalo para ver sus opciones."}
          id="paso-segundo"
          listo={menus.length > 0}
        >
          <div className="space-y-3" data-mama="asoma">
            {ordenar(menuHoy.segundos).map((x) => (
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
                entradas={entradasDisp}
                entrada={entradaElegida}
                onEntrada={setEntradaElegida}
                precio={precioMenu}
                puedeAgregar={puedeAgregar}
                falta={textoFalta}
                onAgregar={agregarMenu}
              />
            ))}
          </div>

          <AnimatePresence>
            {menus.length > 0 && (
              <m.button
                type="button"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={repetirUltimo}
                className="mt-3.5 text-[14.5px] text-terracota font-semibold inline-flex items-center gap-1.5 bg-white border-2 border-terracota/30 rounded-full px-4 py-2"
              >
                + Otro igual al último
              </m.button>
            )}
          </AnimatePresence>
        </Paso>

        {/* Paso 3: extras */}
        {hayPasoExtras && (
          <Paso numero={nPaso.extras} titulo="¿Algo más?" ayuda="Postres, bebidas y adicionales, cada uno aparte." id="paso-extras" listo={totalExtras > 0} mama="texto">
            <div className="space-y-2.5">
              {ordenar(menuHoy.extras).map((x) => (
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
          <details className="mb-9 group -mt-4">
            <summary className="list-none flex items-center gap-1.5 text-[14px] text-texto-secundario font-medium cursor-pointer select-none bg-white rounded-2xl px-4 py-3 shadow-card">
              <ChevronDown size={16} className="transition group-open:rotate-180" />
              ¿Quieres una entrada extra? (+{soles(dia.precioEntradaExtra)} cada una)
            </summary>
            <div className="space-y-2.5 mt-2.5">
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
        <AnimatePresence>
          {hayAlgo && (
            <m.div id="resumen-pedido" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="mb-9 scroll-mt-4">
              <h2 className="font-display text-[1.3rem] text-tinta mb-3 flex items-center gap-2">
                <ShoppingBag size={20} className="text-terracota" /> Tu pedido
              </h2>
              <ResumenPedido lineas={lineasResumen} total={totalPagar} />
            </m.div>
          )}
        </AnimatePresence>

        {/* Paso final: entrega, pago y datos */}
        <Paso numero={nPaso.datos} titulo="Tus datos" ayuda="Los guardamos en este celular para la próxima vez." id="paso-datos" listo={!!(pago && nombre.trim() && telefono.trim())} mama="texto">
          <div className="space-y-5 bg-white rounded-3xl shadow-card p-4">
            {modo === "delivery" && (
              <div id="campo-direccion" className="scroll-mt-24">
                <Field label="Dirección de entrega">
                  <input
                    className={`${inputStyle} ${errorEn("campo-direccion") ? "border-terracota ring-2 ring-terracota/20" : ""}`}
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Jr. Las Flores 123, dpto 4"
                    autoComplete="street-address"
                  />
                </Field>
              </div>
            )}

            <div id="campo-pago" className={`scroll-mt-24 rounded-2xl transition ${errorEn("campo-pago") ? "ring-2 ring-terracota/40 ring-offset-4" : ""}`}>
              <Field label="¿Cómo vas a pagar?">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PAY_LABELS).map(([key, label]) => (
                    <SelectCard
                      key={key}
                      active={pago === key}
                      onClick={() => {
                        vibrar();
                        setPago(key);
                      }}
                      text={label}
                      compact
                    />
                  ))}
                </div>
              </Field>
            </div>

            <div id="campo-nombre" className="scroll-mt-24">
              <Field label="Tu nombre">
                <input
                  className={`${inputStyle} ${errorEn("campo-nombre") ? "border-terracota ring-2 ring-terracota/20" : ""}`}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                />
              </Field>
            </div>

            <div id="campo-telefono" className="scroll-mt-24">
              <Field label="Tu WhatsApp">
                <input
                  className={`${inputStyle} ${errorEn("campo-telefono") ? "border-terracota ring-2 ring-terracota/20" : ""}`}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="999 999 999"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>

            <Field label="Notas (opcional)">
              <input className={inputStyle} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Sin cebolla, poca sal, etc." />
            </Field>

            <AnimatePresence>
              {error.texto && (
                <m.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-terracota text-[14px] font-medium bg-terracota/10 rounded-xl px-3 py-2.5"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  {error.texto}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </Paso>

        <Encuentranos />
      </main>

      {/* Barra fija: cuántos platos lleva, total y enviar */}
      <AnimatePresence>
        {hayAlgo && (
          <m.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="max-w-md mx-auto bg-tinta-oscura/95 backdrop-blur rounded-[26px] shadow-barra border border-white/10 p-2 pl-3 flex items-center gap-3">
              <button type="button" onClick={() => irA("resumen-pedido")} className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-label="Ver mi pedido">
                <m.span
                  key={salto}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.35, 1] }}
                  transition={{ duration: 0.35 }}
                  className="relative w-11 h-11 rounded-full bg-dorado/15 flex items-center justify-center shrink-0"
                >
                  <ShoppingBag id="bolsa-pedido" size={20} className="text-dorado" />
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-terracota text-white text-[11.5px] font-bold flex items-center justify-center">
                    {totalCosas}
                  </span>
                </m.span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] text-[#cfc3ad] uppercase tracking-wide">Ver mi pedido</span>
                  <span className="block font-mono text-dorado text-[18px] font-semibold leading-tight">{soles(totalPagar)}</span>
                </span>
              </button>
              <m.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-cta bg-terracota hover:bg-terracota-oscura disabled:opacity-60 text-white font-semibold rounded-[20px] px-5 py-3.5 text-[15.5px] flex items-center justify-center gap-2 shrink-0"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
                {submitting ? "Enviando…" : "Enviar pedido"}
              </m.button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
