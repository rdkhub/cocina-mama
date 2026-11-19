// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { todayKey, loadOrders, createOrder, updateOrder, updateOrderContenido, deleteOrder } from "../data";
import { cargarPlatos, cargarMenuDia, cargarProteinas, cargarAjustes, CATEGORIAS_EXTRA } from "../lib/catalogo";
import { entrarConPin, salir, sesionAdminActiva } from "../lib/auth";
import { avisar } from "../components/ui/avisar";

const AppContext = createContext(null);

// Error de la base de datos al guardar un pedido del admin → mensaje para la pantalla.
function errorDeGuardado(e) {
  const msg = String(e?.message || "");
  if (msg.includes("AGOTADO")) return new Error(`Agotado: ${msg.split("AGOTADO:")[1]?.trim() || "un plato"}. Cámbialo.`, { cause: e });
  if (msg.includes("MENU_NO_DISPONIBLE")) return new Error("Primero publica el menú de hoy.", { cause: e });
  if (msg.includes("PEDIDO_INVALIDO")) return new Error("El pedido está vacío o tiene una cantidad rara.", { cause: e });
  return new Error("No se pudo guardar. Revisa tu conexión.", { cause: e });
}

// Clave vieja: antes el desbloqueo se guardaba solo en el navegador. Se
// borra para que nadie quede "desbloqueado" sin haber puesto el PIN real.
const CLAVE_DESBLOQUEO_VIEJA = "cm_admin_desbloqueado";

// Lee ?admin=1 y ?pedido=<id> de un link (o de la notificación tocada), y
// ?texto=... cuando el papá comparte un mensaje de WhatsApp a la app.
function leerDestino(url) {
  const params = new URL(url, window.location.origin).searchParams;
  const compartido = ["titulo", "texto", "enlace"]
    .map((k) => (params.get(k) || "").trim())
    .filter(Boolean)
    .join("\n");
  return { admin: params.has("admin") || params.has("pedido") || !!compartido, pedido: params.get("pedido"), compartido };
}

// Estado global de la app: pedidos, catálogo de platos, menú de hoy y ajustes.
// Todo se mantiene al día con Supabase Realtime: si el papá marca un plato
// como agotado, el cliente lo ve al instante sin recargar.
export function AppProvider({ children }) {
  const [destinoInicial] = useState(() => leerDestino(window.location.href));
  const [orders, setOrders] = useState([]);
  const [platos, setPlatos] = useState([]);
  const [proteinas, setProteinas] = useState([]);
  const [menuDia, setMenuDia] = useState({ dia: null, items: [] });
  const [ajustes, setAjustes] = useState({ plantillaSaludo: "", plantillaCierre: "" });
  const [fechaHoy, setFechaHoy] = useState(todayKey());
  // La sesión de admin la valida Supabase (PIN = contraseña del usuario admin).
  const [desbloqueado, setDesbloqueado] = useState(false);
  const desbloqueadoRef = useRef(false);
  const [authListo, setAuthListo] = useState(false);
  const [view, setView] = useState("cliente");
  const [pedidoResaltado, setPedidoResaltado] = useState(destinoInicial.pedido);
  // Mensaje compartido desde WhatsApp, esperando a que el panel lo abra.
  const [mensajeCompartido, setMensajeCompartido] = useState(destinoInicial.compartido);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  // Se limpia la URL para que al recargar no vuelva a abrir el mismo pedido.
  useEffect(() => {
    if (destinoInicial.admin) window.history.replaceState(null, "", "/");
  }, [destinoInicial]);

  const showToast = useCallback((message, variant = "error") => {
    avisar(message, variant);
  }, []);

  const marcarDesbloqueo = useCallback((ok) => {
    desbloqueadoRef.current = ok;
    setDesbloqueado(ok);
  }, []);

  // Lanza un error si el PIN no es correcto (lo muestra PinScreen).
  const desbloquear = useCallback(
    async (pin) => {
      await entrarConPin(pin);
      marcarDesbloqueo(true);
      setView("admin");
    },
    [marcarDesbloqueo]
  );

  const bloquear = useCallback(async () => {
    marcarDesbloqueo(false);
    setOrders([]);
    setView("cliente");
    try {
      await salir();
    } catch {
      /* sin conexión: la sesión local igual se borra */
    }
  }, [marcarDesbloqueo]);

  const abrirAdmin = useCallback(() => setView(desbloqueadoRef.current ? "admin" : "pin"), []);

  // Al abrir la app: ¿este celular ya tiene sesión de admin?
  useEffect(() => {
    try {
      localStorage.removeItem(CLAVE_DESBLOQUEO_VIEJA);
    } catch {
      /* nada */
    }
    let vivo = true;
    sesionAdminActiva()
      .then((ok) => {
        if (!vivo) return;
        marcarDesbloqueo(ok);
        if (destinoInicial.admin) setView(ok ? "admin" : "pin");
      })
      .finally(() => vivo && setAuthListo(true));
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        marcarDesbloqueo(false);
        setOrders([]);
        setView((v) => (v === "admin" ? "pin" : v));
      }
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, [destinoInicial, marcarDesbloqueo]);

  // Notificación tocada con la app ya abierta: el service worker avisa aquí.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMensaje = (e) => {
      if (e.data?.tipo !== "abrir") return;
      const d = leerDestino(e.data.url);
      if (d.pedido) setPedidoResaltado(d.pedido);
      if (d.compartido) setMensajeCompartido(d.compartido);
      if (d.admin) abrirAdmin();
    };
    navigator.serviceWorker.addEventListener("message", onMensaje);
    return () => navigator.serviceWorker.removeEventListener("message", onMensaje);
  }, [abrirAdmin]);

  // Los pedidos solo los ve el admin (la base de datos tampoco se los da a nadie más).
  const refreshOrders = useCallback(async () => setOrders(desbloqueadoRef.current ? await loadOrders() : []), []);

  // Recién entró o salió: cargar (o vaciar) los pedidos.
  useEffect(() => {
    if (authListo) refreshOrders();
  }, [desbloqueado, authListo, refreshOrders]);
  const refreshPlatos = useCallback(async () => {
    try {
      setPlatos(await cargarPlatos());
    } catch (e) {
      console.error("Error cargando platos:", e);
    }
  }, []);
  const refreshMenuDia = useCallback(async (fecha) => {
    try {
      setMenuDia(await cargarMenuDia(fecha));
    } catch (e) {
      console.error("Error cargando menú del día:", e);
    }
  }, []);
  const refreshProteinas = useCallback(async () => {
    try {
      setProteinas(await cargarProteinas());
    } catch (e) {
      console.error("Error cargando proteínas:", e);
    }
  }, []);
  const refreshAjustes = useCallback(async () => {
    try {
      setAjustes(await cargarAjustes());
    } catch (e) {
      console.error("Error cargando ajustes:", e);
    }
  }, []);

  // Si la app queda abierta pasada la medianoche (tablet del local), cambia sola de día.
  useEffect(() => {
    const t = setInterval(() => {
      const k = todayKey();
      setFechaHoy((prev) => (prev === k ? prev : k));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let vivo = true;
    // Carga inicial desde Supabase: los setState ocurren al llegar los datos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([refreshOrders(), refreshPlatos(), refreshMenuDia(fechaHoy), refreshProteinas(), refreshAjustes()]).finally(
      () => vivo && setLoading(false)
    );

    const canal = supabase
      .channel(`cocina-mama-cambios-${fechaHoy}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new?.nombre) {
          setAnnouncement(`Nuevo pedido de ${payload.new.nombre}`);
        }
        refreshOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "platos" }, () => refreshPlatos())
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_dia" }, () => refreshMenuDia(fechaHoy))
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_dia_items" }, () => refreshMenuDia(fechaHoy))
      .on("postgres_changes", { event: "*", schema: "public", table: "ajustes" }, () => refreshAjustes())
      .subscribe();

    // Al volver a la app (celular desbloqueado), se refresca por si el
    // realtime se cortó mientras estaba en segundo plano.
    const alVolver = () => {
      if (document.visibilityState === "visible") {
        refreshOrders();
        refreshMenuDia(fechaHoy);
        refreshPlatos();
      }
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      vivo = false;
      supabase.removeChannel(canal);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [fechaHoy, refreshOrders, refreshPlatos, refreshMenuDia, refreshProteinas, refreshAjustes]);

  // Menú de hoy ya armado para mostrar: cada item con su plato del catálogo.
  const menuHoy = useMemo(() => {
    const porId = new Map(platos.map((p) => [p.id, p]));
    const conPlato = menuDia.items
      .map((item) => ({ item, plato: porId.get(item.platoId) }))
      .filter((x) => x.plato);
    const de = (cats) => conPlato.filter((x) => cats.includes(x.plato.categoria));
    return {
      fecha: fechaHoy,
      dia: menuDia.dia,
      entradas: de(["entrada"]),
      segundos: de(["segundo"]),
      extras: de(CATEGORIAS_EXTRA),
      total: conPlato.length,
    };
  }, [platos, menuDia, fechaHoy]);

  const handleOrderSubmit = async (data) => {
    setSubmitting(true);
    try {
      const order = {
        ...data,
        fecha: fechaHoy,
        creadoEn: new Date().toISOString(),
        listo: false,
        pagado: data.pago !== "fiado",
      };
      const saved = await createOrder(order);
      if (desbloqueadoRef.current) refreshOrders();
      setJustSubmitted(saved);
      return true;
    } catch (e) {
      console.error("Error al crear pedido:", e);
      const msg = String(e?.message || "");
      if (msg.includes("AGOTADO")) {
        const plato = msg.split("AGOTADO:")[1]?.trim();
        showToast(`Lo sentimos, ${plato || "un plato"} se acaba de agotar. Cámbialo, por favor.`);
        refreshMenuDia(fechaHoy);
      } else if (msg.includes("MENU_NO_DISPONIBLE")) {
        showToast("El menú de hoy todavía no está publicado. Intenta en unos minutos.");
        refreshMenuDia(fechaHoy);
      } else {
        showToast("No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Pedido que el papá registra desde WhatsApp o a mano. Lanza el error para
  // que la pantalla lo muestre.
  const crearPedidoAdmin = async (data) => {
    const order = {
      ...data,
      fecha: fechaHoy,
      creadoEn: new Date().toISOString(),
      listo: false,
      pagado: data.pago !== "fiado",
    };
    try {
      await createOrder(order);
    } catch (e) {
      throw errorDeGuardado(e);
    }
    await refreshOrders();
    showToast(`Pedido de ${order.nombre} guardado`, "success");
  };

  // Corregir un pedido ya guardado (Cuaderno). Si cambia la forma de pago,
  // "pagado" se ajusta igual que al crearlo.
  const editarPedidoAdmin = async (id, data) => {
    const antes = orders.find((o) => o.id === id);
    const cambios = { ...data };
    if (antes && data.pago && data.pago !== antes.pago) cambios.pagado = data.pago !== "fiado";
    try {
      await updateOrderContenido(id, cambios);
    } catch (e) {
      throw errorDeGuardado(e);
    }
    await refreshOrders();
    showToast(`Pedido de ${data.nombre} corregido`, "success");
  };

  const handleOrderUpdate = async (id, patch) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    try {
      await updateOrder(id, patch);
    } catch (e) {
      console.error("Error al actualizar pedido:", e);
      setOrders(previous);
      showToast("No se pudo guardar el cambio. Revisa tu conexión e intenta de nuevo.");
    }
  };

  const handleOrderDelete = async (id) => {
    const previous = orders;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    try {
      await deleteOrder(id);
    } catch (e) {
      console.error("Error al borrar pedido:", e);
      setOrders(previous);
      showToast("No se pudo borrar el pedido. Revisa tu conexión e intenta de nuevo.");
    }
  };

  const value = {
    orders,
    platos,
    setPlatos,
    proteinas,
    setProteinas,
    menuDia,
    setMenuDia,
    menuHoy,
    ajustes,
    setAjustes,
    fechaHoy,
    refreshMenuDia,
    refreshPlatos,
    refreshProteinas,
    view,
    setView,
    desbloqueado,
    desbloquear,
    crearPedidoAdmin,
    editarPedidoAdmin,
    mensajeCompartido,
    setMensajeCompartido,
    bloquear,
    abrirAdmin,
    pedidoResaltado,
    setPedidoResaltado,
    loading: loading || !authListo,
    submitting,
    justSubmitted,
    setJustSubmitted,
    showToast,
    announcement,
    handleOrderSubmit,
    handleOrderUpdate,
    handleOrderDelete,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// El hook vive junto al provider a propósito (todos lo importan de aquí).
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de un <AppProvider>");
  return ctx;
}
