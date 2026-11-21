import { describe, it, expect } from "vitest";
import {
  nuevaLinea,
  armarDesdeBotones,
  estadoDesdePedido,
  conteoCocina,
  textoCocina,
} from "../cuaderno";
import { CTX, DIA } from "./menuDePrueba";

const menu = (extra = {}) => ({
  key: "a",
  segundoId: "s-aji",
  proteina: "",
  entradaId: "e-sopa",
  arroz: "con",
  cantidad: 1,
  ...extra,
});

const estado = (extra = {}) => ({
  menus: [],
  extras: {},
  entradasExtra: {},
  ...extra,
});

const pedidoIdaVuelta = {
  fondos: [
    {
      platoId: "s-aji",
      nombre: "Ají de gallina",
      cantidad: 2,
      arroz: "con",
      entradaId: "e-sopa",
      entradaIncluida: "Sopa de casa",
    },
  ],
  entradas: [{ platoId: "e-sopa", nombre: "Sopa de casa", cantidad: 3 }],
  adicionales: [
    { platoId: "x-flan", nombre: "Flan", cantidad: 1, precio: 3.5 },
  ],
};

const pedidosCocina = [
  {
    modo: "recojo",
    fondos: [{ nombre: "Frejoles", cantidad: 2, proteina: "Chuleta" }],
    entradas: [{ nombre: "Sopa de casa", cantidad: 2 }],
    adicionales: [],
  },
  {
    modo: "delivery",
    fondos: [
      {
        nombre: "Frejoles",
        cantidad: 1,
        proteina: "Pollo a la plancha",
        arroz: "sin",
      },
      { nombre: "Ají de gallina", cantidad: 1 },
    ],
    entradas: [{ nombre: "Sopa de casa", cantidad: 1 }],
    adicionales: [{ nombre: "Flan", cantidad: 2 }],
  },
];

describe("nuevaLinea", () => {
  it("crea una línea con cantidad 1 y entrada nula cuando hay varias entradas", () => {
    const linea = nuevaLinea(CTX.segundos[0], CTX);

    expect(linea.cantidad).toBe(1);
    expect(linea.segundoId).toBe("s-aji");
    expect(linea.entradaId).toBeNull();
    expect(linea.arroz).toBe("con");
    expect(linea.proteina).toBe("");
  });

  it("preelige la entrada cuando hoy hay una sola", () => {
    const linea = nuevaLinea(CTX.segundos[0], {
      ...CTX,
      entradas: [CTX.entradas[0]],
    });

    expect(linea.entradaId).toBe("e-sopa");
  });

  it('marca "sin" cuando no hay entradas', () => {
    const linea = nuevaLinea(CTX.segundos[0], { ...CTX, entradas: [] });

    expect(linea.entradaId).toBe("sin");
  });
});

describe("armarDesdeBotones", () => {
  it("arma el pedido con menú, entrada incluida y extra", () => {
    const r = armarDesdeBotones(
      estado({
        menus: [menu({ cantidad: 2 })],
        extras: { "x-chicha": 1 },
      }),
      CTX,
      DIA,
      "recojo"
    );

    expect(r.total).toBe(26);
    expect(r.falta).toBe("");
    expect(r.lineas.fondos[0].cantidad).toBe(2);
    expect(r.lineas.fondos[0].entradaIncluida).toBe("Sopa de casa");
  });

  it("cobra el precio de delivery", () => {
    const r = armarDesdeBotones(
      estado({
        menus: [menu({ cantidad: 2 })],
        extras: { "x-chicha": 1 },
      }),
      CTX,
      DIA,
      "delivery"
    );

    expect(r.total).toBe(28);
  });

  it('no incluye entrada cuando se elige "sin"', () => {
    const r = armarDesdeBotones(
      estado({
        menus: [menu({ entradaId: "sin", cantidad: 1 })],
      }),
      CTX,
      DIA,
      "recojo"
    );

    expect(r.lineas.fondos[0]).not.toHaveProperty("entradaIncluida");
    expect(r.total).toBe(12);
  });

  it("avisa que falta elegir la entrada cuando está en null", () => {
    const r = armarDesdeBotones(
      estado({ menus: [menu({ entradaId: null })] }),
      CTX,
      DIA,
      "recojo"
    );

    expect(r.falta).toMatch(/entrada/i);
  });

  it("avisa que falta la proteína de un plato que la requiere", () => {
    const r = armarDesdeBotones(
      estado({
        menus: [menu({ segundoId: "s-frejol", proteina: "", entradaId: "sin" })],
      }),
      CTX,
      DIA,
      "recojo"
    );

    expect(r.falta).toMatch(/proteína/i);
  });

  it("queda vacío con cantidad 0 o sin nada elegido", () => {
    const porCantidad = armarDesdeBotones(
      estado({ menus: [menu({ cantidad: 0 })] }),
      CTX,
      DIA
    );
    const vacio = armarDesdeBotones(estado(), CTX, DIA);

    expect(porCantidad.vacio).toBe(true);
    expect(porCantidad.total).toBe(0);
    expect(vacio.vacio).toBe(true);
    expect(vacio.total).toBe(0);
  });

  it("cobra las entradas aparte", () => {
    const r = armarDesdeBotones(
      estado({ entradasExtra: { "e-papa": 2 } }),
      CTX,
      DIA,
      "recojo"
    );

    expect(r.total).toBe(6);
  });
});

describe("estadoDesdePedido", () => {
  it("convierte un pedido guardado en estado de botones", () => {
    const e = estadoDesdePedido(pedidoIdaVuelta, CTX);

    expect(e.menus[0].cantidad).toBe(2);
    expect(e.menus[0].entradaId).toBe("e-sopa");
    expect(e.entradasExtra).toEqual({ "e-sopa": 1 });
    expect(e.extras).toEqual({ "x-flan": 1 });
  });

  it('marca "sin" cuando el fondo no tiene entrada', () => {
    const e = estadoDesdePedido(
      {
        fondos: [{ platoId: "s-aji", nombre: "Ají de gallina", cantidad: 1 }],
        entradas: [],
        adicionales: [],
      },
      CTX
    );

    expect(e.menus[0].entradaId).toBe("sin");
  });

  it("da la vuelta completa conservando el total", () => {
    const r = armarDesdeBotones(
      estadoDesdePedido(pedidoIdaVuelta, CTX),
      CTX,
      DIA
    );

    expect(r.total).toBe(12 * 2 + 3 + 3.5);
    expect(r.total).toBe(30.5);
  });
});

describe("conteoCocina", () => {
  it("cuenta menús, pedidos, segundos con variantes, entradas y extras", () => {
    const c = conteoCocina(pedidosCocina);

    expect(c.menus).toBe(4);
    expect(c.pedidos).toBe(2);
    expect(c.delivery).toBe(1);
    expect(c.llevar).toBe(1);

    expect(c.segundos[0]).toEqual({
      nombre: "Frejoles",
      cantidad: 3,
      variantes: [
        { texto: "Chuleta", cantidad: 2 },
        { texto: "Pollo a la plancha, sin arroz", cantidad: 1 },
      ],
    });
    expect(c.segundos[1]).toEqual({
      nombre: "Ají de gallina",
      cantidad: 1,
      variantes: [],
    });

    expect(c.entradas).toEqual([{ nombre: "Sopa de casa", cantidad: 3 }]);
    expect(c.extras).toEqual([{ nombre: "Flan", cantidad: 2 }]);
  });

  it("devuelve todo en cero y listas vacías sin pedidos", () => {
    const c = conteoCocina([]);

    expect(c.menus).toBe(0);
    expect(c.segundos).toEqual([]);
    expect(c.entradas).toEqual([]);
    expect(c.extras).toEqual([]);
  });
});

describe("textoCocina", () => {
  it("resume el conteo en texto legible", () => {
    const texto = textoCocina(conteoCocina(pedidosCocina));

    expect(texto).toContain("3 × Frejoles");
    expect(texto).toContain("2 Chuleta");
    expect(texto).toContain("3 × Sopa de casa");
    expect(texto).toContain("2 × Flan");
    expect(texto).toContain("4 menús");
  });
});
