// src/App.jsx
import { lazy, Suspense } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { AppProvider, useApp } from "./context/AppContext";
import { ClientView } from "./components/client/ClientView";
import { Avisos, Skeleton } from "./components/ui";

// El panel de mamá se descarga aparte: el cliente que abre el link de
// WhatsApp no baja el código del panel (pesa casi la mitad de la app).
const AdminView = lazy(() => import("./components/admin/AdminView").then((m) => ({ default: m.AdminView })));
const PinScreen = lazy(() => import("./components/admin/PinScreen").then((m) => ({ default: m.PinScreen })));

// AppContent lee el estado global (useApp) y decide qué pantalla mostrar.
// Vive separado de App() porque los Context solo se pueden leer DEBAJO del
// <AppProvider>, nunca en el mismo componente que lo declara.
function AppContent() {
  const { view, setView, loading, announcement, desbloquear } = useApp();

  if (loading) return <Skeleton />;

  return (
    <div>
      <Avisos />
      {/* Región invisible para lectores de pantalla: anuncia cuando llega un
          pedido nuevo por realtime. */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {view === "cliente" && <ClientView />}
      <Suspense fallback={<Skeleton />}>
        {view === "pin" && <PinScreen onUnlock={desbloquear} onBack={() => setView("cliente")} />}
        {view === "admin" && <AdminView onBack={() => setView("cliente")} />}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    // "user": respeta a quien tiene activada la opción de reducir animaciones.
    // LazyMotion + domAnimation: solo carga las animaciones que se usan (más liviano).
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <AppContent />
        </AppProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
