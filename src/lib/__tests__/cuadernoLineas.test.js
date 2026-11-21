import { describe, it, expect } from "vitest";
import {
  contextoCuaderno,
  faltaEnLinea,
  textoLinea,
  precioLinea,
} from "../cuaderno";
import { CTX, DIA } from "./menuDePrueba";

const adicional = (extra = {}) => ({
  id: "a-presa",
  nombre: "Presa extra",
  categoria: "adicional",
  activo: true,
  precioExtra: 5,
  ...extra,
});

const linea = (extra = {}) => ({
  segundoId: "s-aji",
  proteina: "",
  entradaId: "e-sopa",
  arroz: "con",
  cantidad: 1,
  ...extra,
});

describe("contextoCuaderno", () => {
  it("agrega los adicionales activos con precio al final, ordenados por nombre", () => {
    const ctx = contextoCuaderno(CTX, [
      adicional({ id: "a-presa", nombre: "Presa extra", precioExtra: 5 }),
      adicional({ id: "a-huevo", nombre: "Huevo sancochado", precioExtra: 2 }),
    ]);

    expect(ctx.extras.map((e) => e.id)).toEqual([
      "x-chicha",
      "x-flan",
      "a-huevo",
      "a-presa",
    ]);
    expect(ctx.extras[2]).toEqual({
      id: "a-huevo",
      nombre: "Huevo sancochado",
      precio: 2,
      agotado: false,
      fijo: true,
    });
    expect(ctx.extras[3]).toEqual({
      id: "a-presa",
      nombre: "Presa extra",
      precio: 5,
      agotado: false,
      fijo: true,
    });
  });

  it("no agrega sin precio, inactivos, de otra categoría ni repetidos", () => {
    const ctx = contextoCuaderno(CTX, [
      adicional({ id: "a-cero", nombre: "Sin precio", precioExtra: 0 }),
      adicional({ id: "a-inactivo", nombre: "Inactivo", activo: false }),
      adicional({ id: "a-postre", nombre: "Postre", categoria: "postre" }),
      adicional({ id: "x-flan", nombre: "Flan repetido" }),
    ]);

    expect(ctx.extras.map((e) => e.id)).toEqual(["x-chicha", "x-flan"]);
  });

  it("recorta los espacios del nombre", () => {
    const ctx = contextoCuaderno(CTX, [
      adicional({ id: "a-presa", nombre: " Presa extra " }),
    ]);

    const presa = ctx.extras.find((e) => e.id === "a-presa");
    expect(presa.nombre).toBe("Presa extra");
  });

  it("no toca segundos ni entradas y no modifica el CTX original", () => {
    const ctx = contextoCuaderno(CTX, [
      adicional({ id: "a-huevo", nombre: "Huevo sancochado", precioExtra: 2 }),
    ]);

    expect(ctx.segundos).toEqual(CTX.segundos);
    expect(ctx.entradas).toEqual(CTX.entradas);
    expect(CTX.extras.length).toBe(2);
    expect(CTX.extras.map((e) => e.id)).toEqual(["x-chicha", "x-flan"]);
  });

  it("sin platos devuelve los mismos extras", () => {
    const ctx = contextoCuaderno(CTX);

    expect(ctx.extras).toEqual(CTX.extras);
    expect(ctx.extras.length).toBe(2);
  });
});

describe("faltaEnLinea", () => {
  it("no pide nada cuando la línea está completa", () => {
    expect(
      faltaEnLinea(
        linea({ segundoId: "s-aji", entradaId: "e-sopa", proteina: "" }),
        CTX
      )
    ).toBe("");
  });

  it("pide la proteína de un plato que la requiere", () => {
    const falta = faltaEnLinea(
      linea({ segundoId: "s-frejol", proteina: "", entradaId: "e-sopa" }),
      CTX
    );

    expect(falta).toMatch(/proteína/i);
    expect(falta).toContain("Frejoles");
  });

  it('pide la entrada cuando está en null y acepta "sin"', () => {
    const falta = faltaEnLinea(linea({ entradaId: null }), CTX);
    const sin = faltaEnLinea(linea({ entradaId: "sin" }), CTX);

    expect(falta).toMatch(/entrada/i);
    expect(sin).toBe("");
  });

  it("devuelve un texto si el segundo no existe", () => {
    expect(faltaEnLinea(linea({ segundoId: "no-existe" }), CTX)).not.toBe("");
  });
});

describe("textoLinea", () => {
  it("describe un menú con proteína, entrada y sin arroz", () => {
    const texto = textoLinea(
      linea({
        cantidad: 2,
        segundoId: "s-frejol",
        proteina: "Chuleta",
        entradaId: "e-sopa",
        arroz: "sin",
      }),
      CTX
    );

    expect(texto).toBe("2 × Frejoles · chuleta · con sopa de casa · sin arroz");
  });

  it('describe un menú con "sin entrada"', () => {
    const texto = textoLinea(
      linea({
        cantidad: 1,
        segundoId: "s-aji",
        proteina: "",
        entradaId: "sin",
        arroz: "con",
      }),
      CTX
    );

    expect(texto).toBe("1 × Ají de gallina · sin entrada");
  });

  it('no dice "sin entrada" si hoy no hay entradas', () => {
    const texto = textoLinea(
      linea({
        cantidad: 1,
        segundoId: "s-aji",
        proteina: "",
        entradaId: "sin",
        arroz: "con",
      }),
      { ...CTX, entradas: [] }
    );

    expect(texto).toBe("1 × Ají de gallina");
    expect(texto).not.toContain("sin entrada");
  });
});

describe("precioLinea", () => {
  it("cobra recojo por defecto", () => {
    expect(precioLinea({ cantidad: 3 }, DIA)).toBe(36);
    expect(precioLinea({ cantidad: 3 }, DIA)).toBe(
      precioLinea({ cantidad: 3 }, DIA, "recojo")
    );
  });

  it("cobra delivery", () => {
    expect(precioLinea({ cantidad: 3 }, DIA, "delivery")).toBe(39);
  });

  it("cobra en casa con su precio (S/ 11 si el día no lo trae)", () => {
    expect(precioLinea({ cantidad: 2 }, DIA, "casa")).toBe(22);
    expect(precioLinea({ cantidad: 2 }, { ...DIA, precioCasa: 10 }, "casa")).toBe(20);
  });

  it("devuelve 0 si no hay día", () => {
    expect(precioLinea({ cantidad: 3 }, null)).toBe(0);
  });
});
