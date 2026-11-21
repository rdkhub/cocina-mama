import { describe, it, expect } from "vitest";
import {
  lunesDe,
  etiquetaSemana,
  etiquetaDia,
  deudasPorSemana,
} from "../deudas";

describe("lunesDe", () => {
  it("devuelve el mismo lunes", () => {
    expect(lunesDe("2026-11-16")).toBe("2026-11-16");
  });

  it("lleva el sábado al lunes de esa semana", () => {
    expect(lunesDe("2026-11-21")).toBe("2026-11-16");
  });

  it("lleva el domingo al lunes de esa semana", () => {
    expect(lunesDe("2026-11-22")).toBe("2026-11-16");
  });

  it("deja el lunes siguiente como está", () => {
    expect(lunesDe("2026-11-23")).toBe("2026-11-23");
  });

  it("cruza el año correctamente", () => {
    expect(lunesDe("2027-01-01")).toBe("2026-12-28");
  });
});

describe("etiquetaSemana", () => {
  it("etiqueta una semana dentro del mismo mes", () => {
    expect(etiquetaSemana("2026-11-16")).toBe("16 – 22 nov");
  });

  it("etiqueta una semana que cruza de mes y de año", () => {
    expect(etiquetaSemana("2026-12-28")).toBe("28 dic – 3 ene");
  });
});

describe("etiquetaDia", () => {
  it("etiqueta el sábado", () => {
    expect(etiquetaDia("2026-11-21")).toBe("Sáb 21");
  });

  it("etiqueta el lunes", () => {
    expect(etiquetaDia("2026-11-16")).toBe("Lun 16");
  });
});

const datos = () => [
  {
    nombre: "Cliente A",
    telefono: "111",
    pedidos: [
      { id: "a1", fecha: "2026-11-17", total: 12, fondos: [{ cantidad: 1 }] },
      { id: "a2", fecha: "2026-11-23", total: 24, fondos: [{ cantidad: 2 }] },
      { id: "a3", fecha: "2026-11-16", total: 11, fondos: [{ cantidad: 1 }] },
    ],
  },
  {
    nombre: "Cliente B",
    telefono: "222",
    pedidos: [
      { id: "b1", fecha: "2026-11-18", total: 30.5, fondos: [{ cantidad: 2 }] },
    ],
  },
];

describe("deudasPorSemana", () => {
  it("devuelve [] con una lista vacía", () => {
    expect(deudasPorSemana([])).toEqual([]);
  });

  it("devuelve [] sin argumento", () => {
    expect(deudasPorSemana()).toEqual([]);
  });

  it("agrupa por semana, de la más nueva a la más vieja", () => {
    const semanas = deudasPorSemana(datos());

    expect(semanas).toHaveLength(2);

    expect(semanas[0].lunes).toBe("2026-11-23");
    expect(semanas[0].monto).toBe(24);
    expect(semanas[0].pedidos).toBe(1);
    expect(semanas[0].menus).toBe(2);
    expect(semanas[0].clientes).toHaveLength(1);

    expect(semanas[1].lunes).toBe("2026-11-16");
    expect(semanas[1].monto).toBe(53.5);
    expect(semanas[1].pedidos).toBe(3);
    expect(semanas[1].menus).toBe(4);

    const [primero, segundo] = semanas[1].clientes;
    expect(primero.nombre).toBe("Cliente B");
    expect(primero.monto).toBe(30.5);
    expect(segundo.nombre).toBe("Cliente A");
    expect(segundo.monto).toBe(23);
    expect(segundo.pedidos.map((p) => p.id)).toEqual(["a3", "a1"]);
    expect(segundo.menus).toBe(2);
  });

  it("separa clientes con el mismo nombre pero distinto teléfono", () => {
    const semanas = deudasPorSemana([
      {
        nombre: "Cliente A",
        telefono: "111",
        pedidos: [{ id: "x1", fecha: "2026-11-16", total: 10, fondos: [] }],
      },
      {
        nombre: "Cliente A",
        telefono: "222",
        pedidos: [{ id: "x2", fecha: "2026-11-16", total: 20, fondos: [] }],
      },
    ]);

    expect(semanas).toHaveLength(1);
    expect(semanas[0].clientes).toHaveLength(2);
    expect(semanas[0].monto).toBe(30);
  });

  it("redondea los montos a 2 decimales", () => {
    const semanas = deudasPorSemana([
      {
        nombre: "Cliente A",
        telefono: "111",
        pedidos: [
          { id: "d1", fecha: "2026-11-16", total: 0.1, fondos: [] },
          { id: "d2", fecha: "2026-11-16", total: 0.2, fondos: [] },
        ],
      },
    ]);

    expect(semanas[0].clientes[0].monto).toBe(0.3);
    expect(semanas[0].monto).toBe(0.3);
  });

  it("cuenta 0 menús en un pedido sin fondos y no falla", () => {
    const semanas = deudasPorSemana([
      {
        nombre: "Cliente A",
        telefono: "111",
        pedidos: [{ id: "s1", fecha: "2026-11-16", total: 15 }],
      },
    ]);

    expect(semanas[0].menus).toBe(0);
    expect(semanas[0].monto).toBe(15);
  });
});
