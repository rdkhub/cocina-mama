// src/App.jsx
import React from "react";
import { Lock, MessageCircle } from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { ClientView } from "./components/client/ClientView";
import { AdminView } from "./components/admin/AdminView";
import { PinScreen } from "./components/admin/PinScreen";
import { Toast, Skeleton } from "./components/ui";
import { WHATSAPP_URL } from "./utils/contacto";

// AppContent lee el estado global (useApp) y decide qué pantalla mostrar.
// Vive separado de App() porque los Context solo se pueden leer DEBAJO del
// <AppProvider>, nunca en el mismo componente que lo declara.
function AppContent() {
  const {
    menu,
    orders,
    view,
    setView,
    loading,
    submitting,
    justSubmitted,
    setJustSubmitted,
    toast,
    announcement,
    handleOrderSubmit,
    handleMenuSave,
    handleOrderUpdate,
    handleOrderDelete,
  } = useApp();

  if (loading || !menu) {
    return <Skeleton />;
  }

  // El cliente nunca debe ver platos, entradas o adicionales vacíos (ej. un campo
  // que tu mamá dejó en blanco al editar el menú). El panel admin sigue viendo todo, vacío o no.
  const menuParaCliente = {
    ...menu,
    fondos: menu.fondos.filter((f) => f.nombre && f.nombre.trim() !== ""),
    entradas: menu.entradas.filter((e) => e && e.trim() !== ""),
    adicionales: (menu.adicionales || []).filter((a) => a.nombre && a.nombre.trim() !== ""),
  };

  return (
    <div>
      <Toast toast={toast} />
      {/* Región invisible para lectores de pantalla: anuncia cuando llega un
          pedido nuevo por realtime, ej. en la tablet del local. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {view === "cliente" ? (
        <>
          <ClientView
            menu={menuParaCliente}
            onSubmit={handleOrderSubmit}
            submitting={submitting}
            justSubmitted={justSubmitted}
            onReset={() => setJustSubmitted(null)}
          />
          {/* Botón flotante de WhatsApp: siempre visible mientras el cliente está
              armando su pedido, como salida fácil si prefiere escribir directo
              o tiene dudas a mitad de camino. */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            title="Escríbenos por WhatsApp"
            className="fixed bottom-4 left-4 bg-[#25D366] text-white rounded-full p-3 shadow-lg opacity-90 hover:opacity-100 z-50"
          >
            <MessageCircle size={18} />
          </a>
          <button
            onClick={() => setView("pin")}
            aria-label="Panel de administración"
            title="Panel de administración"
            className="fixed bottom-4 right-4 bg-[#2B2622] text-[#E0A95C] rounded-full p-3 shadow-lg opacity-70 hover:opacity-100 z-50"
          >
            <Lock size={18} />
          </button>
        </>
      ) : view === "pin" ? (
        <PinScreen onUnlock={() => setView("admin")} onBack={() => setView("cliente")} />
      ) : (
        <AdminView
          menu={menu}
          orders={orders}
          onMenuSave={handleMenuSave}
          onOrderUpdate={handleOrderUpdate}
          onOrderDelete={handleOrderDelete}
          onBack={() => setView("cliente")}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
