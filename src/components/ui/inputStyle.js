// src/components/ui/inputStyle.js
// Clase compartida para todos los <input>/<select> de texto de la app.
// Antes vivía copiada y pegada en OrderForm.jsx, MenuTab.jsx y
// HistorialTab.jsx — ahora los 3 importan de aquí, así que un cambio de
// estilo de inputs se hace en un solo lugar.
export const inputStyle =
  "w-full rounded-lg border border-[#dccdb4] bg-[#FFFDF8] px-3.5 py-2.5 text-[15px] text-[#2B2622] placeholder-[#998C76] outline-none focus:border-[#C1452D] focus:ring-2 focus:ring-[#C1452D]/15 transition";
