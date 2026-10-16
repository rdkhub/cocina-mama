import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { registrarServiceWorker } from "./lib/push";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// El service worker hace que la app se pueda instalar y recibir
// notificaciones. En desarrollo (npm run dev) no se registra.
if (import.meta.env.PROD) {
  window.addEventListener("load", () => registrarServiceWorker());
}
