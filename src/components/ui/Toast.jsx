// src/components/ui/Toast.jsx
// Avisos breves arriba de la pantalla ("Pedido guardado", "No se pudo
// guardar…"), con la librería sonner: entran deslizándose, se apilan si
// llegan varios y se pueden cerrar deslizando con el dedo.
// Para mostrar uno se usa avisar() de ./avisar.js.
import { Toaster } from "sonner";

export function Avisos() {
  return (
    <Toaster
      position="top-center"
      offset={16}
      mobileOffset={12}
      duration={3800}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "w-full flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-floating text-[14.5px] font-medium font-sans border",
          success: "bg-salvia text-white border-salvia-oscura",
          error: "bg-terracota text-white border-terracota-oscura",
          info: "bg-tinta text-crema border-tinta-oscura",
        },
      }}
    />
  );
}
