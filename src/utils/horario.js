// src/utils/horario.js
// Horario de atención y el aviso "Abierto ahora" / "Abrimos mañana…".
// Siempre con la hora de Lima, aunque el celular del cliente esté en otra zona.

export const HORARIO = {
  dias: [1, 2, 3, 4, 5, 6], // 0 = domingo … 6 = sábado
  abre: 12 * 60, // 12:00
  cierra: 16 * 60, // 16:00
  texto: "Lunes a sábado · 12:00 p. m. – 4:00 p. m.",
  dias_texto: "Lunes a sábado",
  horas_texto: "12:00\u00a0p.\u00a0m. – 4:00\u00a0p.\u00a0m.",
  cerrado: "Domingo cerrado",
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const NUM_DIA = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// Día de la semana y minutos desde la medianoche, en Lima.
export function horaLima(fecha = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Lima", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value])
  );
  return { dia: NUM_DIA[partes.weekday.toLowerCase()], minutos: Number(partes.hour) * 60 + Number(partes.minute) };
}

// "12:00 p. m.", "4:00 p. m."
export function horaTexto(minutos) {
  const h = Math.floor(minutos / 60);
  const m = String(minutos % 60).padStart(2, "0");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  // Espacios que no se cortan: "12:00 p. m." siempre queda en una línea.
  return `${h12}:${m}\u00a0${h < 12 ? "a.\u00a0m." : "p.\u00a0m."}`;
}

// { abierto, texto } para el aviso del local.
export function estadoLocal(fecha = new Date(), horario = HORARIO) {
  const { dia, minutos } = horaLima(fecha);
  const abreHoy = horario.dias.includes(dia);
  if (abreHoy && minutos >= horario.abre && minutos < horario.cierra) {
    const faltan = horario.cierra - minutos;
    return {
      abierto: true,
      texto: faltan <= 30 ? `Cerramos pronto, a las ${horaTexto(horario.cierra)}` : `Abierto ahora · hasta las ${horaTexto(horario.cierra)}`,
    };
  }
  if (abreHoy && minutos < horario.abre) return { abierto: false, texto: `Abrimos hoy a las ${horaTexto(horario.abre)}` };
  // Próximo día que abre.
  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    if (horario.dias.includes(d)) {
      const cuando = i === 1 ? "mañana" : `el ${DIAS[d]}`;
      return { abierto: false, texto: `Abrimos ${cuando} a las ${horaTexto(horario.abre)}` };
    }
  }
  return { abierto: false, texto: "Cerrado" };
}
