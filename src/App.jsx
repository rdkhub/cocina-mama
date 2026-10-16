// src/App.jsx
import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { ClientView } from "./components/client/ClientView";
import { AdminView } from "./components/admin/AdminView";
import { PinScreen } from "./components/admin/PinScreen";
import { Toast, Skeleton } from "./components/ui";

// AppContent lee el estado global (useApp) y decide qué pantalla mostrar.
// Vive separado de App() porque los Context solo se pueden leer DEBAJO del
// <AppProvider>, nunca en el mismo componente que lo declara.
function AppContent() {
  const { view, setView, loading, toast, announcement, desbloquear } = useApp();

  if (loading) return <Skeleton />;

  return (
    <div>
      <Toast toast={toast} />
      {/* Región invisible para lectores de pantalla: anuncia cuando llega un
          pedido nuevo por realtime. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {view === "cliente" && <ClientView />}
      {view === "pin" && <PinScreen onUnlock={desbloquear} onBack={() => setView("cliente")} />}
      {view === "admin" && <AdminView onBack={() => setView("cliente")} />}
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
