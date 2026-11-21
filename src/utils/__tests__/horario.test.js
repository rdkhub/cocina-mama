import { describe, it, expect } from "vitest";
import { estadoLocal as estadoReal, horaTexto as horaReal, horaLima } from "../horario";

// Los textos usan espacios que no se cortan (\u00a0); aquí se comparan como espacios normales.
const sinNbsp = (t) => t.replace(/\u00a0/g, " ");
const horaTexto = (m) => sinNbsp(horaReal(m));
const estadoLocal = (f) => {
  const e = estadoReal(f);
  return { ...e, texto: sinNbsp(e.texto) };
};

it("las horas no se cortan en dos líneas", () => {
  expect(horaReal(12 * 60)).toBe("12:00\u00a0p.\u00a0m.");
});

// Lima es UTC-5 todo el año: 12:00 en Lima = 17:00 UTC.
const lima = (iso) => new Date(`${iso}-05:00`);

describe("horaTexto", () => {
  it("formatea en 12 horas", () => {
    expect(horaTexto(12 * 60)).toBe("12:00 p. m.");
    expect(horaTexto(16 * 60)).toBe("4:00 p. m.");
    expect(horaTexto(9 * 60 + 5)).toBe("9:05 a. m.");
  });
});

describe("horaLima", () => {
  it("usa la hora de Lima aunque la fecha venga en otra zona", () => {
    // 2026-11-18 es miércoles.
    expect(horaLima(new Date("2026-11-18T17:30:00Z"))).toEqual({ dia: 3, minutos: 12 * 60 + 30 });
  });
});

describe("estadoLocal", () => {
  it("abierto un miércoles a la 1 p. m.", () => {
    expect(estadoLocal(lima("2026-11-18T13:00:00"))).toEqual({ abierto: true, texto: "Abierto ahora · hasta las 4:00 p. m." });
  });
  it("avisa que cierra pronto en la última media hora", () => {
    expect(estadoLocal(lima("2026-11-18T15:40:00")).texto).toBe("Cerramos pronto, a las 4:00 p. m.");
  });
  it("antes de las 12 dice que abre hoy", () => {
    expect(estadoLocal(lima("2026-11-18T10:00:00"))).toEqual({ abierto: false, texto: "Abrimos hoy a las 12:00 p. m." });
  });
  it("a las 4 en punto ya está cerrado y abre mañana", () => {
    expect(estadoLocal(lima("2026-11-18T16:00:00"))).toEqual({ abierto: false, texto: "Abrimos mañana a las 12:00 p. m." });
  });
  it("sábado en la tarde: abre el lunes", () => {
    expect(estadoLocal(lima("2026-11-21T17:00:00")).texto).toBe("Abrimos el lunes a las 12:00 p. m.");
  });
  it("domingo: abre mañana (lunes)", () => {
    expect(estadoLocal(lima("2026-11-22T13:00:00")).texto).toBe("Abrimos mañana a las 12:00 p. m.");
  });
});
