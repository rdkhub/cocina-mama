// src/components/admin/CompartirMenu.jsx
// "Compartir menú de hoy": abre WhatsApp con el texto ya escrito (wa.me,
// sin API ni librerías no oficiales) y permite descargar una imagen del
// menú para subir a un estado o grupo.
import { useState } from "react";
import { MessageCircle, Copy, Check, ImageDown, Loader2, Share2 } from "lucide-react";
import { textoMenuWhatsApp, linkWhatsApp } from "../../lib/compartir";
import { generarImagenMenu, nombreArchivoMenu } from "../../lib/imagenMenu";

export function CompartirMenu({ menuHoy, ajustes, showToast }) {
  const [copiado, setCopiado] = useState(false);
  const [generando, setGenerando] = useState(false);
  const sinPlatos = menuHoy.total === 0;

  const texto = textoMenuWhatsApp(menuHoy, ajustes);

  const copiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      showToast("No se pudo copiar. Selecciona el texto manualmente.");
    }
  };

  const descargarImagen = async () => {
    setGenerando(true);
    try {
      const blob = await generarImagenMenu(menuHoy);
      const nombre = nombreArchivoMenu(menuHoy.fecha);
      const archivo = new File([blob], nombre, { type: "image/jpeg" });

      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: "Menú de hoy — Cocina de Mamá" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      if (e?.name !== "AbortError") showToast(e.message || "No se pudo generar la imagen.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#eee2cb] shadow-card p-4 space-y-3">
      <h3 className="text-[14.5px] font-semibold text-tinta flex items-center gap-1.5">
        <Share2 size={16} className="text-terracota" /> Compartir menú de hoy
      </h3>

      {sinPlatos ? (
        <p className="text-[13px] text-texto-terciario">Arma el menú de hoy primero para poder compartirlo.</p>
      ) : (
        <>
          <textarea readOnly value={texto} rows={6} className="w-full rounded-lg border border-arena-oscura bg-[#FFFDF8] px-3.5 py-2.5 text-[13px] text-texto-inactivo leading-relaxed resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <a
              href={linkWhatsApp(texto)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1fb857] text-white font-medium rounded-xl py-2.5 text-[13.5px]"
            >
              <MessageCircle size={15} /> Enviar por WhatsApp
            </a>
            <button onClick={copiarTexto} className="flex items-center justify-center gap-1.5 border border-arena-oscura text-texto-secundario font-medium rounded-xl py-2.5 text-[13.5px] hover:bg-crema">
              {copiado ? <Check size={15} className="text-salvia" /> : <Copy size={15} />}
              {copiado ? "Copiado" : "Copiar texto"}
            </button>
          </div>
          <button
            onClick={descargarImagen}
            disabled={generando}
            className="w-full flex items-center justify-center gap-1.5 border border-arena-oscura text-texto-secundario font-medium rounded-xl py-2.5 text-[13.5px] hover:bg-crema disabled:opacity-60"
          >
            {generando ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
            {generando ? "Generando imagen…" : "Descargar imagen del menú"}
          </button>
        </>
      )}
    </div>
  );
}
