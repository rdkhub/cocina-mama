// src/components/ui/Sheet.jsx
// Panel que sube desde abajo, con la librería vaul: se cierra arrastrándolo
// hacia abajo con el dedo (como en WhatsApp), tocando fuera, con la X o con
// la tecla Escape. En pantallas grandes queda centrado y angosto.
import { Drawer } from "vaul";
import { X } from "lucide-react";

export function Sheet({ open, onClose, title, children, footer }) {
  return (
    <Drawer.Root open={open} onOpenChange={(abierto) => !abierto && onClose?.()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[55] bg-tinta-oscura/50 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[56] mx-auto w-full sm:max-w-md max-h-[94dvh] bg-crema rounded-t-[28px] shadow-2xl flex flex-col outline-none"
        >
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <div className="w-10" />
            <div className="w-11 h-1.5 rounded-full bg-arena-oscura" aria-hidden />
            <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-texto-secundario hover:bg-arena/60 active:scale-90 transition">
              <X size={20} />
            </button>
          </div>
          {title ? (
            <Drawer.Title className="font-display text-xl text-tinta px-5 pb-3">{title}</Drawer.Title>
          ) : (
            <Drawer.Title className="sr-only">Panel</Drawer.Title>
          )}
          <div className="overflow-y-auto px-5 pb-5 flex-1" data-vaul-no-drag>
            {children}
          </div>
          {footer && <div className="px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-divisor bg-crema">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
