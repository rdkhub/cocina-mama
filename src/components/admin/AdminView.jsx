// src/components/admin/AdminView.jsx
import React, { useState, useEffect } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { todayKey, todayLabel, loadPlatosFrecuentes, guardarPlatoFrecuente } from "../../data";
import { calcularTotal } from "../../utils/pedidos";
import { PedidosTab } from "./tabs/PedidosTab";
import { MenuTab } from "./tabs/MenuTab";
import { DeudasTab } from "./tabs/DeudasTab";
import { HistorialTab } from "./tabs/HistorialTab";
import { SemanalTab } from "./tabs/SemanalTab";

// AdminView es el "contenedor" del panel de mamá: guarda el estado de qué
// pestaña está activa, el borrador del menú que se está editando, los filtros
// de historial, y todos los cálculos derivados (deudas, resumen semanal,
// etc.). Cada pestaña (PedidosTab, MenuTab, ...) es presentacional.
export function AdminView({ menu, orders, onMenuSave, onOrderUpdate, onOrderDelete, onBack }) {
  const { showToast } = useApp();
  const [tab, setTab] = useState("pedidos"); // pedidos | menu | deudas | historial | semanal
  const [draft, setDraft] = useState(menu);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fechaHistorial, setFechaHistorial] = useState(todayKey());
  const [modoHistorial, setModoHistorial] = useState("fecha"); // fecha | cliente
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [platosFrecuentes, setPlatosFrecuentes] = useState([]);

  useEffect(() => setDraft(menu), [menu]);

  // Carga la biblioteca de platos frecuentes una sola vez al entrar al panel.
  useEffect(() => {
    loadPlatosFrecuentes().then(setPlatosFrecuentes);
  }, []);

  // Agrega un plato de la biblioteca al menú de hoy, ya con su nombre y
  // proteínas listos — así no hay que volver a escribir nada para un plato
  // que ya se usó antes.
  const agregarFondoDesdeBiblioteca = (plato) => {
    setDraft({
      ...draft,
      fondos: [...draft.fondos, { nombre: plato.nombre, proteinas: plato.proteinas || "", permiteArroz: !!plato.permiteArroz }],
    });
  };

  // Un pedido se considera "de prueba" si su nombre contiene la palabra PRUEBA
  // (sin importar mayúsculas/minúsculas). Estos pedidos siguen viéndose en
  // "Pedidos de hoy" para poder gestionarlos, pero NO cuentan en Deudas,
  // Historial ni en el Resumen semanal, para no inflar las estadísticas reales.
  const esPrueba = (o) => o.nombre.toLowerCase().includes("prueba");
  const ordersReales = orders.filter((o) => !esPrueba(o));

  const todaysOrders = orders.filter((o) => o.fecha === todayKey());
  const totalVendidoHoy = todaysOrders.reduce(
    (acc, o) => acc + (typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales)),
    0
  );

  const updateList = (field, idx, value) => {
    const copy = { ...draft, [field]: [...draft[field]] };
    copy[field][idx] = value;
    setDraft(copy);
  };

  // Actualiza un campo específico (nombre, proteinas o permiteArroz) de un plato de fondo
  const updateFondo = (idx, campo, value) => {
    const copy = { ...draft, fondos: draft.fondos.map((f, i) => (i === idx ? { ...f, [campo]: value } : f)) };
    setDraft(copy);
  };

  // Agrega un plato de fondo nuevo y vacío al final de la lista
  const agregarFondoMenu = () => {
    setDraft({ ...draft, fondos: [...draft.fondos, { nombre: "", proteinas: "", permiteArroz: false }] });
  };

  // Quita un plato de fondo del menú (deja al menos 1)
  const quitarFondoMenu = (idx) => {
    if (draft.fondos.length <= 1) return;
    setDraft({ ...draft, fondos: draft.fondos.filter((_, i) => i !== idx) });
  };

  const saveMenuDraft = async () => {
    try {
      await onMenuSave({ ...draft, fecha: todayKey() });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);

      // Guarda automáticamente en la biblioteca cualquier plato nuevo (o con
      // proteínas actualizadas) que se haya usado en este menú, para que la
      // próxima vez aparezca como opción rápida. No requiere ninguna acción
      // extra de quien edita el menú.
      const platosValidos = draft.fondos.filter((f) => f.nombre && f.nombre.trim() !== "");
      let listaActualizada = platosFrecuentes;
      for (const plato of platosValidos) {
        const guardado = await guardarPlatoFrecuente(plato, listaActualizada);
        const yaEstaba = listaActualizada.some((p) => p.id === guardado.id);
        listaActualizada = yaEstaba
          ? listaActualizada.map((p) => (p.id === guardado.id ? guardado : p))
          : [...listaActualizada, guardado];
      }
      setPlatosFrecuentes(listaActualizada);
    } catch (e) {
      console.error("Error al guardar el menú:", e);
      showToast("No se pudo guardar el menú. Revisa tu conexión e intenta de nuevo.");
    }
  };

  // Deudas: agrupar por cliente (nombre + telefono) sumando pedidos con pago === fiado y no pagados
  const deudas = {};
  ordersReales.forEach((o) => {
    if (!o.pagado) {
      const key = `${o.nombre}|${o.telefono}`;
      const montoPedido = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
      if (!deudas[key]) deudas[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], cantidad: 0, monto: 0 };
      deudas[key].pedidos.push(o);
      deudas[key].cantidad += 1;
      deudas[key].monto += montoPedido;
    }
  });
  const deudaList = Object.values(deudas).sort((a, b) => b.monto - a.monto);

  // Historial: lista de fechas distintas con pedidos, más recientes primero
  const fechasConPedidos = Array.from(new Set(ordersReales.map((o) => o.fecha))).sort((a, b) => b.localeCompare(a));
  const ordersDelDia = ordersReales.filter((o) => o.fecha === fechaHistorial);
  const totalDelDia = ordersDelDia.reduce(
    (acc, o) => acc + (typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales)),
    0
  );

  // Búsqueda por cliente: agrupa TODOS los pedidos (de cualquier fecha) que
  // coincidan con el nombre o teléfono buscado, sin importar si están pagados o no.
  const clientesEncontrados = (() => {
    const termino = busquedaCliente.trim().toLowerCase();
    if (!termino) return [];
    const grupos = {};
    ordersReales
      .filter(
        (o) =>
          o.nombre.toLowerCase().includes(termino) || o.telefono.toLowerCase().includes(termino)
      )
      .forEach((o) => {
        const key = `${o.nombre}|${o.telefono}`;
        const montoPedido = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
        if (!grupos[key]) {
          grupos[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], totalGastado: 0, totalDebe: 0 };
        }
        grupos[key].pedidos.push(o);
        grupos[key].totalGastado += montoPedido;
        if (!o.pagado) grupos[key].totalDebe += montoPedido;
      });
    return Object.values(grupos).sort((a, b) => b.pedidos.length - a.pedidos.length);
  })();

  // Resumen semanal: últimos 7 días (incluyendo hoy), de lunes a domingo si es posible,
  // pero simplemente toma los 7 días corridos más recientes para no depender de en qué
  // día de la semana se esté revisando.
  const resumenSemanal = (() => {
    const hoy = new Date();
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const nombresDia = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      dias.push({ fecha: key, etiqueta: nombresDia[d.getDay()], total: 0, pedidos: 0 });
    }
    const fechasSemana = new Set(dias.map((d) => d.fecha));
    const ordersSemana = ordersReales.filter((o) => fechasSemana.has(o.fecha));

    let totalSemana = 0;
    let totalDeudaSemana = 0;
    const conteoPlatos = {};
    const deudoresSemana = {};

    ordersSemana.forEach((o) => {
      const monto = typeof o.total === "number" ? o.total : calcularTotal(o.fondos, o.entradas, o.modo, o.adicionales);
      const diaDelPedido = dias.find((d) => d.fecha === o.fecha);
      if (diaDelPedido) {
        diaDelPedido.total += monto;
        diaDelPedido.pedidos += 1;
      }
      totalSemana += monto;
      if (!o.pagado) {
        totalDeudaSemana += monto;
        const key = `${o.nombre}|${o.telefono}`;
        if (!deudoresSemana[key]) deudoresSemana[key] = { nombre: o.nombre, telefono: o.telefono, monto: 0, pedidos: 0 };
        deudoresSemana[key].monto += monto;
        deudoresSemana[key].pedidos += 1;
      }

      (o.fondos || []).forEach((f) => {
        conteoPlatos[f.nombre] = (conteoPlatos[f.nombre] || 0) + (f.cantidad || 0);
      });
    });

    const listaDeudores = Object.values(deudoresSemana).sort((a, b) => b.monto - a.monto);

    const platosTop = Object.entries(conteoPlatos)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const maxDia = Math.max(1, ...dias.map((d) => d.total));

    return { dias, totalSemana, totalDeudaSemana, platosTop, listaDeudores, totalPedidos: ordersSemana.length, maxDia };
  })();

  return (
    <div className="min-h-screen bg-[#FBF6EC]">
      <header className="bg-gradient-to-b from-[#332A21] to-[#211B16] text-[#FBF6EC] px-5 pt-6 pb-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#cfc3ad] text-sm hover:text-white">
            <ArrowLeft size={16} /> Ver como cliente
          </button>
          <div className="flex items-center gap-2">
            <Lock size={15} color="#E0A95C" />
            <span className="text-sm text-[#E0A95C]">Panel de mamá</span>
          </div>
        </div>
      </header>

      {/* max-w-5xl (antes 3xl) y md:flex: en mobile, la navegación es una barra
          horizontal arriba (como antes). Desde tablet en adelante (md:), se
          convierte en una barra lateral fija a la izquierda del contenido —
          aprovecha el espacio horizontal de una tablet en el local en vez de
          desperdiciarlo con pestañas angostas arriba. */}
      <div className="max-w-5xl mx-auto px-5 md:flex md:gap-6 md:items-start">
        <nav
          aria-label="Secciones del panel"
          className="flex gap-1 -mt-px bg-white rounded-xl border border-[#eee2cb] p-1 mt-4 mb-5 overflow-x-auto md:flex-col md:w-48 md:shrink-0 md:mb-0 md:sticky md:top-4 md:overflow-visible"
        >
          {[
            { id: "pedidos", label: `Hoy (${todaysOrders.length})` },
            { id: "menu", label: "Menú" },
            { id: "deudas", label: `Deben (${deudaList.length})` },
            { id: "historial", label: "Historial" },
            { id: "semanal", label: "Semanal" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex-1 md:flex-none md:w-full text-center md:text-left text-[13px] md:text-[14px] py-2 md:py-2.5 md:px-3 rounded-lg font-medium transition whitespace-nowrap ${
                tab === t.id ? "bg-[#2B2622] text-white" : "text-[#6E6253] hover:bg-[#FBF6EC]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
        {tab === "pedidos" && (
          <PedidosTab
            todaysOrders={todaysOrders}
            totalVendidoHoy={totalVendidoHoy}
            onOrderUpdate={onOrderUpdate}
            onOrderDelete={onOrderDelete}
          />
        )}

        {tab === "menu" && (
          <MenuTab
            draft={draft}
            setDraft={setDraft}
            updateList={updateList}
            updateFondo={updateFondo}
            agregarFondoMenu={agregarFondoMenu}
            quitarFondoMenu={quitarFondoMenu}
            saveMenuDraft={saveMenuDraft}
            savedFlash={savedFlash}
            platosFrecuentes={platosFrecuentes}
            onAgregarDesdeBiblioteca={agregarFondoDesdeBiblioteca}
          />
        )}

        {tab === "deudas" && <DeudasTab deudaList={deudaList} onOrderUpdate={onOrderUpdate} />}

        {tab === "historial" && (
          <HistorialTab
            modoHistorial={modoHistorial}
            setModoHistorial={setModoHistorial}
            fechaHistorial={fechaHistorial}
            setFechaHistorial={setFechaHistorial}
            fechasConPedidos={fechasConPedidos}
            ordersDelDia={ordersDelDia}
            totalDelDia={totalDelDia}
            busquedaCliente={busquedaCliente}
            setBusquedaCliente={setBusquedaCliente}
            clientesEncontrados={clientesEncontrados}
            onOrderUpdate={onOrderUpdate}
            onOrderDelete={onOrderDelete}
            todayKey={todayKey}
            todayLabel={todayLabel}
          />
        )}

        {tab === "semanal" && <SemanalTab resumenSemanal={resumenSemanal} todayKey={todayKey} />}
        </main>
      </div>
    </div>
  );
}
