import { describe, it, expect } from "vitest";
import { calcularTotalDia } from "../pedidos";
import { DIA } from "../../lib/__tests__/menuDePrueba";

describe("calcularTotalDia", () => {
  it("cobra 2 fondos con entrada incluida y 2 entradas en recojo", () => {
    const pedido = {
      fondos: [
        { cantidad: 1, entradaIncluida: "Sopa de casa" },
        { cantidad: 1, entradaIncluida: "Sopa de casa" },
      ],
      entradas: [{ cantidad: 2 }],
    };

    expect(calcularTotalDia(pedido, DIA, "recojo")).toBe(24);
  });

  it("cobra los mismos fondos con entrada incluida en delivery", () => {
    const pedido = {
      fondos: [
        { cantidad: 1, entradaIncluida: "Sopa de casa" },
        { cantidad: 1, entradaIncluida: "Sopa de casa" },
      ],
      entradas: [{ cantidad: 2 }],
    };

    expect(calcularTotalDia(pedido, DIA, "delivery")).toBe(26);
  });

  it("cobra una entrada suelta además de un fondo sin entrada", () => {
    const pedido = {
      fondos: [{ cantidad: 1 }],
      entradas: [{ cantidad: 1 }],
    };

    expect(calcularTotalDia(pedido, DIA, "recojo")).toBe(15);
  });

  it("cobra solo las entradas cuando no hay fondos", () => {
    const pedido = { entradas: [{ cantidad: 2 }] };

    expect(calcularTotalDia(pedido, DIA, "recojo")).toBe(6);
  });

  it("cobra los adicionales según su propio precio", () => {
    const pedido = { adicionales: [{ cantidad: 2, precio: 3.5 }] };

    expect(calcularTotalDia(pedido, DIA, "recojo")).toBe(7);
  });

  it("devuelve 0 si no hay día", () => {
    const pedido = { fondos: [{ cantidad: 1 }] };

    expect(calcularTotalDia(pedido, null, "recojo")).toBe(0);
  });
});
