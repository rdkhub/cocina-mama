// src/components/client/OrderConfirmation.jsx
// Pantalla de "¡Pedido recibido!": check que se dibuja solo y un poco de
// confeti con los colores de la casa, para que el cliente sepa sin duda que
// su pedido llegó.
import { useEffect } from "react";
import { m } from "motion/react";
import { Wallet, RotateCcw } from "lucide-react";
import { Row, vibrar } from "../ui";
import { PAY_LABELS, soles } from "../../utils/pedidos";

function CheckDibujado() {
  return (
    <m.div
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
      className="w-24 h-24 rounded-full bg-salvia flex items-center justify-center mx-auto mb-6 shadow-[0_14px_34px_-10px_rgba(92,122,79,0.65)]"
    >
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
        <m.path
          d="M13 27.5 L22.5 37 L40 17"
          stroke="#fff"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
        />
      </svg>
    </m.div>
  );
}

export function OrderConfirmation({ menuHoy, justSubmitted, onReset }) {
  useEffect(() => {
    vibrar([20, 60, 30]);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Se carga solo aquí: el confeti no pesa nada en el resto de la página.
    import("canvas-confetti").then(({ default: confetti }) => {
      const colores = ["#C1452D", "#E0A95C", "#5C7A4F", "#FBF6EC"];
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.35 }, colors: colores, scalar: 0.9, disableForReducedMotion: true });
      setTimeout(() => confetti({ particleCount: 50, spread: 110, origin: { y: 0.3 }, colors: colores, scalar: 0.8, disableForReducedMotion: true }), 280);
    });
  }, []);

  const incluidasPorPlato = {};
  justSubmitted.fondos.forEach((f) => {
    if (f.entradaIncluida) incluidasPorPlato[f.entradaIncluida] = (incluidasPorPlato[f.entradaIncluida] || 0) + f.cantidad;
  });
  const entradasExtra = (justSubmitted.entradas || [])
    .map((e) => {
      const extra = e.cantidad - (incluidasPorPlato[e.nombre] || 0);
      return extra > 0 ? { ...e, cantidad: extra } : null;
    })
    .filter(Boolean);

  const aparece = (i) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.35 + i * 0.08 } });

  return (
    <div className="min-h-screen bg-crema flex items-center justify-center px-5 py-10">
      <div className="max-w-sm w-full text-center">
        <CheckDibujado />
        <m.h2 {...aparece(0)} className="font-display text-[1.9rem] text-tinta mb-2">
          ¡Pedido recibido!
        </m.h2>
        <m.p {...aparece(1)} className="text-etiqueta text-[15.5px] leading-relaxed mb-7">
          Tu pedido ya está en la cocina. Te avisamos por WhatsApp cuando esté listo
          {justSubmitted.modo === "delivery" ? " para salir." : " para recoger."}
        </m.p>
        <m.div {...aparece(2)} className="text-left bg-white rounded-3xl shadow-card border border-[#eee2cb] p-4 mb-6 text-[14.5px]">
          {justSubmitted.fondos.map((f, i) => {
            const detalles = [f.proteina, f.entradaIncluida ? `con ${f.entradaIncluida}` : null, f.arroz === "sin" ? "sin arroz" : null].filter(Boolean);
            return (
              <Row key={"f" + i} label={f.cantidad > 1 ? `Plato (x${f.cantidad})` : "Plato"} value={detalles.length > 0 ? `${f.nombre} — ${detalles.join(", ")}` : f.nombre} />
            );
          })}
          {entradasExtra.map((e, i) => (
            <Row key={"ex" + i} label={e.cantidad > 1 ? `Entrada extra (x${e.cantidad})` : "Entrada extra"} value={e.nombre} />
          ))}
          {(justSubmitted.adicionales || []).map((a, i) => (
            <Row key={"a" + i} label={a.cantidad > 1 ? `Adicional (x${a.cantidad})` : "Adicional"} value={a.nombre} />
          ))}
          {menuHoy?.dia?.refresco?.trim() && <Row label="Refresco" value={`${menuHoy.dia.refresco.trim()} (incluido)`} />}
          <Row label="Pago" value={PAY_LABELS[justSubmitted.pago]} />
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-divisor">
            <span className="font-medium text-texto-secundario">Total a pagar</span>
            <span className="font-mono text-[20px] font-semibold text-terracota">{soles(justSubmitted.total)}</span>
          </div>
        </m.div>

        {justSubmitted.pago === "yape" && (
          <m.div {...aparece(3)} className="bg-salvia/10 border border-salvia/30 rounded-3xl p-4 mb-6 text-left flex items-start gap-2.5">
            <Wallet size={18} color="#5C7A4F" className="shrink-0 mt-0.5" />
            <p className="text-[#3a4a32] text-[14.5px] leading-relaxed">No olvides mandar tu captura del Yape por WhatsApp para confirmar tu pago.</p>
          </m.div>
        )}

        <m.button
          {...aparece(4)}
          whileTap={{ scale: 0.95 }}
          onClick={onReset}
          className="inline-flex items-center gap-2 text-terracota text-[15px] font-semibold bg-white border-2 border-terracota/25 rounded-full px-5 py-2.5"
        >
          <RotateCcw size={16} /> Hacer otro pedido
        </m.button>
      </div>
    </div>
  );
}
