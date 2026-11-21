// src/components/admin/AdminView.jsx
import { useState, useMemo } from "react";
import { m } from "motion/react";
import {
  Lock,
  ArrowLeft,
  NotebookPen,
  ClipboardList,
  UtensilsCrossed,
  Wallet,
  ChefHat,
  History,
  BarChart3,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { vibrar } from "../ui";
import { Sheet } from "../ui/Sheet";
import { useApp } from "../../context/AppContext";
import { todayKey } from "../../data";
import {
  cargarMenuDia,
  guardarPlato,
  cambiarActivoPlato,
  subirFotoPlato,
  borrarFotoPlato,
  asegurarMenuDia,
  actualizarMenuDia,
  agregarItem,
  quitarItem,
  actualizarItem,
  listarDiasConMenu,
  copiarMenu,
  sincronizarMenuViejo,
  guardarAjustes,
  ordenarItems,
} from "../../lib/catalogo";
import { PedidosTab } from "./tabs/PedidosTab";
import { CuadernoTab } from "./tabs/CuadernoTab";
import { MenuTab } from "./tabs/MenuTab";
import { PlatosTab } from "./tabs/PlatosTab";
import { DeudasTab } from "./tabs/DeudasTab";
import { HistorialTab } from "./tabs/HistorialTab";
import { SemanalTab } from "./tabs/SemanalTab";
import { AjustesTab } from "./tabs/AjustesTab";
import { CompartirMenu } from "./CompartirMenu";
import { NuevoPedidoSheet } from "./NuevoPedidoSheet";

// AdminView es el "contenedor" del panel de mamá: guarda qué pestaña está
// activa y coordina las acciones del catálogo y del menú de hoy. Los datos
// globales (pedidos, platos, menú, ajustes) vienen de useApp().
export function AdminView({ onBack }) {
  const {
    orders,
    platos,
    setPlatos,
    proteinas,
    menuDia,
    setMenuDia,
    menuHoy,
    ajustes,
    setAjustes,
    fechaHoy,
    refreshMenuDia,
    refreshPlatos,
    showToast,
    pedidoResaltado,
    bloquear,
    handleOrderUpdate,
    handleOrderDelete,
    crearPedidoAdmin,
    editarPedidoAdmin,
    mensajeCompartido,
    setMensajeCompartido,
  } = useApp();


  const [masAbierto, setMasAbierto] = useState(false);
  // cuaderno | pedidos | menu | platos | deudas | historial | semanal | ajustes
  const [tab, setTab] = useState(() => (pedidoResaltado || mensajeCompartido ? "pedidos" : "cuaderno"));
  // Nuevo pedido de WhatsApp: se abre solo cuando el papá comparte un mensaje.
  const [nuevoPedido, setNuevoPedido] = useState(() => ({ open: !!mensajeCompartido, texto: mensajeCompartido || "" }));
  // Mensaje compartido o notificación que llega con el panel ya abierto: se
  // atiende durante el render (patrón recomendado por React, sin efectos).
  const [compartidoVisto, setCompartidoVisto] = useState(mensajeCompartido);
  if (mensajeCompartido && mensajeCompartido !== compartidoVisto) {
    setCompartidoVisto(mensajeCompartido);
    setTab("pedidos");
    setNuevoPedido({ open: true, texto: mensajeCompartido });
  }
  const [resaltadoVisto, setResaltadoVisto] = useState(pedidoResaltado);
  if (pedidoResaltado && pedidoResaltado !== resaltadoVisto) {
    setResaltadoVisto(pedidoResaltado);
    setTab("pedidos");
  }
  // "Corregir" desde Hoy: abre el Cuaderno con ese pedido cargado.
  const [corregirId, setCorregirId] = useState(null);
  const corregirEnCuaderno = (id) => {
    setCorregirId(id);
    setTab("cuaderno");
  };
  const cerrarNuevoPedido = () => {
    setNuevoPedido({ open: false, texto: "" });
    setMensajeCompartido("");
    setCompartidoVisto("");
  };
  const [fechaHistorial, setFechaHistorial] = useState(todayKey());
  const [modoHistorial, setModoHistorial] = useState("fecha");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [diasAnteriores, setDiasAnteriores] = useState([]);
  const [cargandoDiasAnteriores, setCargandoDiasAnteriores] = useState(false);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);

  const platosPorId = useMemo(() => new Map(platos.map((p) => [p.id, p])), [platos]);

  // Un pedido se considera "de prueba" si su nombre contiene la palabra PRUEBA.
  const esPrueba = (o) => o.nombre.toLowerCase().includes("prueba");
  const ordersReales = orders.filter((o) => !esPrueba(o));

  const todaysOrders = orders.filter((o) => o.fecha === todayKey());
  const totalVendidoHoy = todaysOrders.reduce((acc, o) => acc + o.total, 0);

  // ---------- Menú de hoy ----------
  const sincronizar = async (dia, items) => sincronizarMenuViejo(fechaHoy, dia, items, platosPorId);

  const handleToggleItem = async (plato) => {
    const item = menuDia.items.find((it) => it.platoId === plato.id);
    try {
      if (item) {
        setMenuDia((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== item.id) }));
        await quitarItem(item.id);
      } else {
        await asegurarMenuDia(fechaHoy);
        const nuevo = await agregarItem(fechaHoy, plato.id, menuDia.items.length);
        setMenuDia((prev) => ({ ...prev, items: [...prev.items, nuevo] }));
      }
      const fresco = await cargarMenuDia(fechaHoy);
      setMenuDia(fresco);
      sincronizar(fresco.dia, fresco.items);
    } catch (e) {
      console.error(e);
      showToast("No se pudo actualizar el menú. Revisa tu conexión.");
      refreshMenuDia(fechaHoy);
    }
  };

  // Desde la pestaña Menú: crea el plato si no existe (o lo reactiva) y lo
  // pone en el menú de hoy.
  const handleCrearYAgregar = async (nombre, categoria) => {
    const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    let plato = platos.find((p) => p.categoria === categoria && norm(p.nombre) === norm(nombre));
    try {
      if (plato && !plato.activo) {
        await cambiarActivoPlato(plato.id, true);
        plato = { ...plato, activo: true };
        const reactivado = plato;
        setPlatos((prev) => prev.map((p) => (p.id === reactivado.id ? reactivado : p)));
      }
      if (!plato) {
        plato = await guardarPlato({
          nombre,
          categoria,
          descripcion: "",
          fotoUrl: "",
          fotoPath: "",
          fotosProteina: {},
          requiereProteina: false,
          permiteArroz: false,
          precioExtra: 0,
          activo: true,
        });
        const creado = plato;
        setPlatos((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      if (!menuDia.items.some((it) => it.platoId === plato.id)) await handleToggleItem(plato);
      showToast(`${plato.nombre} quedó en el menú de hoy`, "success");
      return true;
    } catch (e) {
      console.error(e);
      showToast(e.message || "No se pudo agregar el plato.");
      return false;
    }
  };

  const handleToggleProteina = async (plato, item, nombre) => {
    if (!item) return;
    const actuales = item.proteinas || [];
    const nuevas = actuales.includes(nombre) ? actuales.filter((p) => p !== nombre) : [...actuales, nombre];
    setMenuDia((prev) => ({ ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, proteinas: nuevas } : it)) }));
    try {
      await actualizarItem(item.id, { proteinas: nuevas });
      const fresco = await cargarMenuDia(fechaHoy);
      sincronizar(fresco.dia, fresco.items);
    } catch (e) {
      console.error(e);
      showToast("No se pudo guardar la proteína.");
      refreshMenuDia(fechaHoy);
    }
  };

  // Nuevo orden del menú (arrastrando en la pestaña Menú).
  const handleReordenar = async (ids) => {
    const pos = new Map(ids.map((id, i) => [id, i]));
    setMenuDia((prev) => ({ ...prev, items: prev.items.map((it) => (pos.has(it.id) ? { ...it, orden: pos.get(it.id) } : it)) }));
    try {
      await ordenarItems(ids);
      const fresco = await cargarMenuDia(fechaHoy);
      sincronizar(fresco.dia, fresco.items);
    } catch (e) {
      console.error(e);
      showToast("No se pudo guardar el orden.");
      refreshMenuDia(fechaHoy);
    }
  };

  const handleToggleAgotado = async (item) => {
    if (!item) return;
    const agotado = !item.agotado;
    setMenuDia((prev) => ({ ...prev, items: prev.items.map((it) => (it.id === item.id ? { ...it, agotado } : it)) }));
    try {
      await actualizarItem(item.id, { agotado });
    } catch (e) {
      console.error(e);
      showToast("No se pudo marcar como agotado.");
      refreshMenuDia(fechaHoy);
    }
  };

  const handlePrecioExtra = async (plato, valor) => {
    setPlatos((prev) => prev.map((p) => (p.id === plato.id ? { ...p, precioExtra: valor } : p)));
    try {
      await guardarPlato({ ...plato, precioExtra: valor });
    } catch (e) {
      console.error(e);
      showToast("No se pudo guardar el precio.");
      refreshPlatos();
    }
  };

  const handleGuardarPrecios = async (valores) => {
    setGuardandoPrecios(true);
    try {
      await asegurarMenuDia(fechaHoy);
      await actualizarMenuDia(fechaHoy, {
        precioRecojo: Number(valores.precioRecojo) || 0,
        precioDelivery: Number(valores.precioDelivery) || 0,
        precioEntradaExtra: Number(valores.precioEntradaExtra) || 0,
        refresco: valores.refresco || "",
      });
      const fresco = await cargarMenuDia(fechaHoy);
      setMenuDia(fresco);
      sincronizar(fresco.dia, fresco.items);
      showToast("Precios guardados.", "success");
    } catch (e) {
      console.error(e);
      showToast("No se pudieron guardar los precios.");
      throw e;
    } finally {
      setGuardandoPrecios(false);
    }
  };

  const handleAbrirDias = async () => {
    if (diasAnteriores.length > 0 || cargandoDiasAnteriores) return;
    setCargandoDiasAnteriores(true);
    try {
      setDiasAnteriores(await listarDiasConMenu(fechaHoy));
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoDiasAnteriores(false);
    }
  };

  const handleCopiar = async (desde) => {
    try {
      await copiarMenu(desde, fechaHoy);
      const fresco = await cargarMenuDia(fechaHoy);
      setMenuDia(fresco);
      sincronizar(fresco.dia, fresco.items);
      showToast(`Menú copiado de ${desde}.`, "success");
    } catch (e) {
      console.error(e);
      showToast("No se pudo copiar ese menú.");
    }
  };

  // ---------- Catálogo de platos ----------
  const handleGuardarPlato = async (plato) => {
    const guardado = await guardarPlato(plato);
    setPlatos((prev) => {
      const existe = prev.some((p) => p.id === guardado.id);
      return existe ? prev.map((p) => (p.id === guardado.id ? guardado : p)) : [...prev, guardado].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  };

  const handleCambiarActivo = async (id, activo) => {
    setPlatos((prev) => prev.map((p) => (p.id === id ? { ...p, activo } : p)));
    try {
      await cambiarActivoPlato(id, activo);
    } catch (e) {
      console.error(e);
      showToast("No se pudo actualizar el plato.");
      refreshPlatos();
    }
  };

  // ---------- Ajustes ----------
  const handleGuardarAjustes = async (nuevos) => {
    await guardarAjustes(nuevos);
    setAjustes(nuevos);
  };

  // Deudas: agrupar por cliente
  const deudas = {};
  ordersReales.forEach((o) => {
    if (!o.pagado) {
      const key = `${o.nombre}|${o.telefono}`;
      if (!deudas[key]) deudas[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], cantidad: 0, monto: 0 };
      deudas[key].pedidos.push(o);
      deudas[key].cantidad += 1;
      deudas[key].monto += o.total;
    }
  });
  const deudaList = Object.values(deudas).sort((a, b) => b.monto - a.monto);

  // Historial
  const fechasConPedidos = Array.from(new Set(ordersReales.map((o) => o.fecha))).sort((a, b) => b.localeCompare(a));
  const ordersDelDia = ordersReales.filter((o) => o.fecha === fechaHistorial);
  const totalDelDia = ordersDelDia.reduce((acc, o) => acc + o.total, 0);

  const clientesEncontrados = (() => {
    const termino = busquedaCliente.trim().toLowerCase();
    if (!termino) return [];
    const grupos = {};
    ordersReales
      .filter((o) => o.nombre.toLowerCase().includes(termino) || o.telefono.toLowerCase().includes(termino))
      .forEach((o) => {
        const key = `${o.nombre}|${o.telefono}`;
        if (!grupos[key]) grupos[key] = { nombre: o.nombre, telefono: o.telefono, pedidos: [], totalGastado: 0, totalDebe: 0 };
        grupos[key].pedidos.push(o);
        grupos[key].totalGastado += o.total;
        if (!o.pagado) grupos[key].totalDebe += o.total;
      });
    return Object.values(grupos).sort((a, b) => b.pedidos.length - a.pedidos.length);
  })();

  // Resumen semanal: últimos 7 días corridos.
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
      const monto = o.total;
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

  // Las 4 primeras van en la barra de abajo del celular; el resto, en "Más".
  const TABS = [
    { id: "cuaderno", label: "Cuaderno", Icono: NotebookPen },
    { id: "pedidos", label: "Hoy", Icono: ClipboardList, cuenta: todaysOrders.length },
    { id: "menu", label: "Menú", Icono: UtensilsCrossed },
    { id: "deudas", label: "Deben", Icono: Wallet, cuenta: deudaList.length, alerta: true },
    { id: "platos", label: "Platos", Icono: ChefHat },
    { id: "historial", label: "Historial", Icono: History },
    { id: "semanal", label: "Semanal", Icono: BarChart3 },
    { id: "ajustes", label: "Ajustes", Icono: Settings },
  ];
  const PRINCIPALES = TABS.slice(0, 4);
  const EN_MAS = TABS.slice(4);
  const irATab = (id) => {
    vibrar();
    setTab(id);
    setMasAbierto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-crema">
      <header className="bg-gradient-to-b from-tinta-media to-tinta-oscura text-crema px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[#cfc3ad] text-sm hover:text-white">
            <ArrowLeft size={16} /> Ver como cliente
          </button>
          <button onClick={bloquear} className="flex items-center gap-2 text-dorado text-sm hover:text-white" title="Cerrar el panel">
            <Lock size={15} />
            Panel de mamá
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 md:flex md:gap-6 md:items-start">
        {/* Pantallas grandes (tablet acostada, computadora): menú al costado */}
        <nav aria-label="Secciones del panel" className="hidden md:flex flex-col gap-1 bg-white rounded-2xl border border-[#eee2cb] shadow-card p-1.5 mt-4 w-52 shrink-0 sticky top-4">
          {TABS.map(({ id, label, Icono, cuenta, alerta }) => (
            <button
              key={id}
              onClick={() => irATab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`w-full flex items-center gap-2.5 text-left text-[14.5px] py-2.5 px-3 rounded-xl font-medium transition ${
                tab === id ? "bg-tinta text-white shadow-card" : "text-texto-secundario hover:bg-crema"
              }`}
            >
              <Icono size={18} />
              {label}
              {cuenta > 0 && (
                <span className={`ml-auto text-[11.5px] font-bold rounded-full px-2 py-0.5 ${alerta ? "bg-terracota text-white" : tab === id ? "bg-white/15" : "bg-crema"}`}>
                  {cuenta}
                </span>
              )}
            </button>
          ))}
        </nav>

        <main className="min-w-0 flex-1 pt-4 pb-28 md:pb-10">
          {tab === "cuaderno" && (
            <CuadernoTab
              todaysOrders={todaysOrders}
              orders={orders}
              menuHoy={menuHoy}
              platos={platos}
              onCrear={crearPedidoAdmin}
              onEditar={editarPedidoAdmin}
              onOrderUpdate={handleOrderUpdate}
              onOrderDelete={handleOrderDelete}
              editarId={corregirId}
              onEditarCargado={() => setCorregirId(null)}
            />
          )}

          {tab === "pedidos" && (
            <PedidosTab
              onNuevoPedido={() => setNuevoPedido({ open: true, texto: "" })}
              todaysOrders={todaysOrders}
              totalVendidoHoy={totalVendidoHoy}
              onOrderUpdate={handleOrderUpdate}
              onOrderDelete={handleOrderDelete}
              resaltadoId={pedidoResaltado}
              onCorregir={corregirEnCuaderno}
            />
          )}

          {tab === "menu" && (
            <div className="space-y-5">
              <MenuTab
                platos={platos}
                proteinas={proteinas}
                menuDia={menuDia}
                menuHoy={menuHoy}
                dia={menuDia.dia}
                diasAnteriores={diasAnteriores}
                cargandoDiasAnteriores={cargandoDiasAnteriores}
                onAbrirDias={handleAbrirDias}
                onCopiar={handleCopiar}
                onToggleItem={handleToggleItem}
                onCrearYAgregar={handleCrearYAgregar}
                onToggleProteina={handleToggleProteina}
                onToggleAgotado={handleToggleAgotado}
                onGuardarPrecios={handleGuardarPrecios}
                onPrecioExtra={handlePrecioExtra}
                onReordenar={handleReordenar}
                guardandoPrecios={guardandoPrecios}
              />
              <CompartirMenu menuHoy={menuHoy} ajustes={ajustes} showToast={showToast} />
            </div>
          )}

          {tab === "platos" && (
            <PlatosTab
              platos={platos}
              proteinas={proteinas}
              onGuardar={handleGuardarPlato}
              onCambiarActivo={handleCambiarActivo}
              onSubirFoto={subirFotoPlato}
              onBorrarFoto={borrarFotoPlato}
              showToast={showToast}
            />
          )}

          {tab === "deudas" && <DeudasTab deudaList={deudaList} onOrderUpdate={handleOrderUpdate} />}

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
              onOrderUpdate={handleOrderUpdate}
              onOrderDelete={handleOrderDelete}
              todayKey={todayKey}
            />
          )}

          {tab === "semanal" && <SemanalTab resumenSemanal={resumenSemanal} todayKey={todayKey} />}

          {tab === "ajustes" && <AjustesTab ajustes={ajustes} onGuardarAjustes={handleGuardarAjustes} showToast={showToast} />}
        </main>
      </div>

      {/* Celular: barra de pestañas abajo, al alcance del pulgar */}
      <nav
        aria-label="Secciones del panel"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-[#eee2cb] shadow-barra pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {[...PRINCIPALES, { id: "mas", label: "Más", Icono: MoreHorizontal }].map(({ id, label, Icono, cuenta, alerta }) => {
            const activo = id === "mas" ? EN_MAS.some((t) => t.id === tab) : tab === id;
            return (
              <m.button
                key={id}
                whileTap={{ scale: 0.88 }}
                onClick={() => (id === "mas" ? (vibrar(), setMasAbierto(true)) : irATab(id))}
                aria-current={activo ? "page" : undefined}
                className="relative flex flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11.5px] font-medium"
              >
                {activo && <m.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="absolute top-0 h-[3px] w-10 rounded-b-full bg-terracota" />}
                <span className={`relative w-12 h-8 rounded-full flex items-center justify-center transition-colors ${activo ? "bg-terracota/10 text-terracota" : "text-texto-terciario"}`}>
                  <Icono size={21} strokeWidth={activo ? 2.4 : 2} />
                  {cuenta > 0 && (
                    <span className={`absolute -top-1 right-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-bold flex items-center justify-center ${alerta ? "bg-terracota text-white" : "bg-tinta text-white"}`}>
                      {cuenta}
                    </span>
                  )}
                </span>
                <span className={activo ? "text-terracota font-semibold" : "text-texto-secundario"}>{label}</span>
              </m.button>
            );
          })}
        </div>
      </nav>

      <Sheet open={masAbierto} onClose={() => setMasAbierto(false)} title="Más">
        <div className="grid grid-cols-2 gap-2.5">
          {EN_MAS.map(({ id, label, Icono }) => (
            <m.button
              key={id}
              whileTap={{ scale: 0.95 }}
              onClick={() => irATab(id)}
              className={`flex flex-col items-start gap-2 rounded-2xl p-4 border-2 text-left transition ${
                tab === id ? "border-terracota bg-terracota-suave" : "border-transparent bg-white shadow-card"
              }`}
            >
              <span className="w-10 h-10 rounded-xl bg-crema flex items-center justify-center text-terracota">
                <Icono size={20} />
              </span>
              <span className="text-[15px] font-semibold text-tinta">{label}</span>
            </m.button>
          ))}
        </div>
      </Sheet>

      <NuevoPedidoSheet
        open={nuevoPedido.open}
        textoInicial={nuevoPedido.texto}
        onClose={cerrarNuevoPedido}
        menuHoy={menuHoy}
        platos={platos}
        orders={orders}
        onGuardar={crearPedidoAdmin}
        showToast={showToast}
      />
    </div>
  );
}
