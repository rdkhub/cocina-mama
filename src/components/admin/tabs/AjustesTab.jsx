// src/components/admin/tabs/AjustesTab.jsx
// Notificaciones push y plantilla del mensaje de WhatsApp.
import React, { useState, useEffect } from "react";
import { Bell, BellRing, BellOff, Send, Loader2, Smartphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { Field, inputStyle } from "../../ui";
import { estadoNotificaciones, activarNotificaciones, desactivarNotificaciones, enviarPrueba, esIOS, estaInstalada } from "../../../lib/push";
import { SALUDO_POR_DEFECTO, CIERRE_POR_DEFECTO } from "../../../lib/compartir";

export function AjustesTab({ ajustes, onGuardarAjustes, showToast }) {
  const [estado, setEstado] = useState("cargando");
  const [cargando, setCargando] = useState(false);
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [saludo, setSaludo] = useState(ajustes.plantillaSaludo || SALUDO_POR_DEFECTO);
  const [cierre, setCierre] = useState(ajustes.plantillaCierre ?? CIERRE_POR_DEFECTO);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [flashGuardado, setFlashGuardado] = useState(false);

  useEffect(() => {
    estadoNotificaciones().then(setEstado);
  }, []);
  useEffect(() => {
    setSaludo(ajustes.plantillaSaludo || SALUDO_POR_DEFECTO);
    setCierre(ajustes.plantillaCierre ?? CIERRE_POR_DEFECTO);
  }, [ajustes]);

  const activar = async () => {
    setCargando(true);
    try {
      await activarNotificaciones();
      setEstado("activas");
      showToast("Notificaciones activadas en este celular.", "success");
    } catch (e) {
      showToast(e.message || "No se pudo activar.");
    } finally {
      setCargando(false);
    }
  };

  const desactivar = async () => {
    setCargando(true);
    try {
      await desactivarNotificaciones();
      setEstado("inactivas");
      showToast("Notificaciones desactivadas en este celular.", "success");
    } catch {
      showToast("No se pudo desactivar.");
    } finally {
      setCargando(false);
    }
  };

  const probar = async () => {
    setEnviandoPrueba(true);
    try {
      const r = await enviarPrueba();
      if (r.enviadas > 0) showToast("Notificación de prueba enviada. Revisa tu celular.", "success");
      else showToast("No llegó la notificación. Vuelve a activarlas.");
    } catch (e) {
      showToast(e.message || "No se pudo enviar la prueba.");
    } finally {
      setEnviandoPrueba(false);
    }
  };

  const guardarPlantilla = async () => {
    setGuardandoPlantilla(true);
    try {
      await onGuardarAjustes({ plantillaSaludo: saludo, plantillaCierre: cierre });
      setFlashGuardado(true);
      setTimeout(() => setFlashGuardado(false), 1800);
    } catch {
      showToast("No se pudo guardar la plantilla.");
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={17} className="text-terracota" />
          <h3 className="text-[14.5px] font-semibold text-tinta">Notificaciones de pedidos nuevos</h3>
        </div>
        <p className="text-[13px] text-texto-secundario leading-relaxed mb-3.5">
          Actívalas en este celular para enterarte apenas llega un pedido, con el nombre del cliente, los platos y el total.
        </p>

        {esIOS() && !estaInstalada() && (
          <div className="flex items-start gap-2 bg-ocre/10 border border-ocre/30 rounded-xl px-3 py-2.5 mb-3.5 text-[12.5px] text-[#6b5530]">
            <Smartphone size={15} className="shrink-0 mt-0.5" />
            En iPhone, primero instala la app: toca Compartir → "Agregar a inicio", y ábrela desde ese ícono.
          </div>
        )}

        {estado === "bloqueadas" && (
          <div className="flex items-start gap-2 bg-terracota/8 border border-terracota/25 rounded-xl px-3 py-2.5 mb-3.5 text-[12.5px] text-[#7a2c1a]">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            Bloqueaste las notificaciones. Actívalas en Ajustes del celular → Notificaciones → Chrome.
          </div>
        )}

        {estado === "activas" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-salvia text-[13.5px] font-medium">
              <CheckCircle2 size={16} /> Activadas en este celular
            </div>
            <div className="flex gap-2">
              <button
                onClick={probar}
                disabled={enviandoPrueba}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13.5px] font-medium border border-arena-oscura rounded-xl py-2.5 text-texto-secundario hover:bg-crema"
              >
                {enviandoPrueba ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                Enviar prueba
              </button>
              <button onClick={desactivar} disabled={cargando} className="flex-1 flex items-center justify-center gap-1.5 text-[13.5px] font-medium border border-arena-oscura rounded-xl py-2.5 text-terracota hover:bg-crema">
                <BellOff size={14} /> Desactivar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={activar}
            disabled={cargando || estado === "no-soportado" || estado === "cargando"}
            className="btn-cta w-full bg-terracota hover:bg-terracota-oscura disabled:opacity-50 text-white font-medium rounded-xl py-3 text-[14.5px] flex items-center justify-center gap-2"
          >
            {cargando ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
            Activar notificaciones
          </button>
        )}

        {estado === "no-soportado" && <p className="text-[12.5px] text-texto-terciario mt-2">Este navegador no permite notificaciones. Usa Google Chrome.</p>}
      </div>

      <div className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4 space-y-3">
        <h3 className="text-[14.5px] font-semibold text-tinta">Plantilla del mensaje de WhatsApp</h3>
        <p className="text-[13px] text-texto-secundario leading-relaxed -mt-1.5">
          Se usa cuando compartes el menú del día. Los platos y precios se agregan solos.
        </p>
        <Field label="Saludo inicial">
          <input className={inputStyle} value={saludo} onChange={(e) => setSaludo(e.target.value)} />
        </Field>
        <Field label="Mensaje final (opcional)">
          <input className={inputStyle} value={cierre} onChange={(e) => setCierre(e.target.value)} />
        </Field>
        <button
          onClick={guardarPlantilla}
          disabled={guardandoPlantilla}
          className="btn-cta-salvia w-full bg-salvia hover:bg-salvia-oscura disabled:opacity-60 text-white font-medium rounded-xl py-2.5 text-[14px] flex items-center justify-center gap-2"
        >
          {guardandoPlantilla && <Loader2 size={15} className="animate-spin" />}
          {flashGuardado ? "✓ Guardado" : "Guardar plantilla"}
        </button>
      </div>
    </div>
  );
}
