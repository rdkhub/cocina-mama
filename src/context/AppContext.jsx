// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { todayKey, loadOrders, createOrder, updateOrder, deleteOrder } from "../data";
import { cargarPlatos, cargarMenuDia, cargarProteinas, cargarAjustes, CATEGORIAS_EXTRA } from "../lib/catalogo";

const AppContext = createContext(null);

// El PIN se pide una vez por celular. Después la app recuerda que ese
// celular es del local (así, al tocar una notificación entra directo).
const CLAVE_DESBLOQUEO = "cm_admin_desbloqueado";
const leerDesbloqueo = () => {
  try {
    return localStorage.getItem(CLAVE_DESBLOQUEO) === "1";
  } catch {
    return false;
  }
};

// Lee ?admin=1 y ?pedido=<id> de un link (o de la notificación tocada).
function leerDestino(url) {
  const params = new URL(url, window.location.origin).searchParams;
  return { admin: params.has("admin") || params.has("pedido"), pedido: params.get("pedido") };
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
  const [desbloqueado, setDesbloqueado] = useState(leerDesbloqueo);
  const [view, setView] = useState(() => (destinoInicial.admin ? (leerDesbloqueo() ? "admin" : "pin") : "cliente"));
  const [pedidoResaltado, setPedidoResaltado] = useState(destinoInicial.pedido);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(null);
  const [toast, setToast] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const toastTimer = useRef(null);

  // Se limpia la URL para que al recargar no vuelva a abrir el mismo pedido.
  useEffect(() => {
    if (destinoInicial.admin) window.history.replaceState(null, "", "/");
  }, [destinoInicial]);

  const showToast = useCallback((message, variant = "error") => {
    clearTimeout(toastTimer.current);
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  const desbloquear = useCallback(() => {
    try {
      localStorage.setItem(CLAVE_DESBLOQUEO, "1");
    } catch {
      /* modo incógnito: se pedirá el PIN otra vez */
    }
    setDesbloqueado(true);
    setView("admin");
  }, []);

  const bloquear = useCallback(() => {
    try {
      localStorage.removeItem(CLAVE_DESBLOQUEO);
    } catch {
      /* nada */
    }
    setDesbloqueado(false);
    setView("cliente");
  }, []);

  const abrirAdmin = useCallback(() => setView(leerDesbloqueo() ? "admin" : "pin"), []);

  // Notificación tocada con la app ya abierta: el service worker avisa aquí.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMensaje = (e) => {
      if (e.data?.tipo !== "abrir") return;
      const d = leerDestino(e.data.url);
      if (d.pedido) setPedidoResaltado(d.pedido);
      if (d.admin) abrirAdmin();
    };
    navigator.serviceWorker.addEventListener("message", onMensaje);
    return () => navigator.serviceWorker.removeEventListener("message", onMensaje);
  }, [abrirAdmin]);

  const refreshOrders = useCallback(async () => setOrders(await loadOrders()), []);
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
      setOrders((prev) => (prev.some((o) => o.id === saved.id) ? prev : [...prev, saved]));
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
    bloquear,
    abrirAdmin,
    pedidoResaltado,
    setPedidoResaltado,
    loading,
    submitting,
    justSubmitted,
    setJustSubmitted,
    toast,
    showToast,
    announcement,
    handleOrderSubmit,
    handleOrderUpdate,
    handleOrderDelete,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de un <AppProvider>");
  return ctx;
}
