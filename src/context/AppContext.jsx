// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { todayKey, loadMenu, saveMenu, loadOrders, createOrder, updateOrder, deleteOrder } from "../data";

const AppContext = createContext(null);

// AppProvider centraliza TODO el estado que antes vivía dentro del componente
// App() de 1700 líneas: el menú del día, la lista de pedidos, en qué vista
// está el usuario (cliente/pin/admin), y las funciones para crear/actualizar/
// borrar pedidos y guardar el menú. Cualquier componente de la app puede leer
// esto con el hook useApp() en vez de recibir 10 props distintas.
export function AppProvider({ children }) {
  const [menu, setMenu] = useState(null);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("cliente"); // cliente | pin | admin
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(null);
  const [toast, setToast] = useState(null);

  // Muestra un aviso breve (ej: "no se pudo guardar") que desaparece solo.
  const showToast = useCallback((message, variant = "error") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const refresh = useCallback(async () => {
    const [m, o] = await Promise.all([loadMenu(), loadOrders()]);
    setMenu(m);
    setOrders(o);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Realtime: cuando alguien hace un pedido o se actualiza el menú,
    // todos los que tengan la página abierta (ej. la tablet del local) lo ven al instante.
    const ordersChannel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        refresh();
      })
      .subscribe();

    const menuChannel = supabase
      .channel("menu-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [refresh]);

  const handleOrderSubmit = async (data) => {
    setSubmitting(true);
    try {
      const order = {
        ...data,
        fecha: todayKey(),
        creadoEn: new Date().toISOString(),
        listo: false,
        pagado: data.pago !== "fiado",
      };
      const saved = await createOrder(order);
      setOrders((prev) => [...prev, saved]);
      setJustSubmitted(saved);
    } catch (e) {
      console.error("Error al crear pedido:", e);
      alert("No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMenuSave = async (newMenu) => {
    await saveMenu(newMenu);
    setMenu(newMenu);
  };

  // Actualiza el pedido en pantalla de inmediato (se siente instantáneo), pero
  // si Supabase falla al guardar, REVIERTE el cambio visual y avisa — así el
  // panel nunca muestra algo distinto a lo que realmente hay guardado.
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

  // Mismo patrón que handleOrderUpdate: si borrar falla en Supabase, el
  // pedido vuelve a aparecer en la lista en vez de quedar "borrado" solo
  // en la pantalla de quien lo intentó borrar.
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
    menu,
    orders,
    view,
    setView,
    loading,
    submitting,
    justSubmitted,
    setJustSubmitted,
    toast,
    handleOrderSubmit,
    handleMenuSave,
    handleOrderUpdate,
    handleOrderDelete,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook para leer el contexto desde cualquier componente:
//   const { menu, orders, view, setView } = useApp();
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de un <AppProvider>");
  return ctx;
}
