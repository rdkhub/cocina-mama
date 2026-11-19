import { describe, it, expect } from "vitest";
import {
  interpretarFila,
  agregarAlTexto,
  faltaParaAnotar,
  resumenPedido,
  armarLineas,
} from "../cuaderno";
import { CTX, DIA } from "./menuDePrueba";

const fondosSimples = (interp) =>
  interp.lineas.fondos.map((f) => [
    f.cantidad,
    f.nombre,
    f.proteina ?? null,
    f.entradaIncluida ?? null,
  ]);

describe("interpretarFila", () => {
  it("lee 2 ají con sopa y una chicha", () => {
    const interp = interpretarFila('2 ají con sopa, 1 chicha', CTX, DIA);

    expect(fondosSimples(interp)).toEqual([
      [2, "Ají de gallina", null, "Sopa de casa"],
    ]);
    expect(interp.lineas.adicionales.map((a) => [a.cantidad, a.nombre])).toEqual([
      [1, "Chicha morada"],
    ]);
    expect(interp.total).toBe(26);
    expect(interp.modo).toBe("recojo");
    expect(interp.pago).toBeNull();
  });

  it("avisa que falta la proteína de los frejoles", () => {
    const interp = interpretarFila("1 frejol", CTX, DIA);

    expect(interp.faltaProteina.some((f) => f.nombre === "Frejoles")).toBe(true);
    expect(interp.total).toBe(12);
  });

  it("asigna la proteína chuleta a los frejoles", () => {
    const interp = interpretarFila("1 frejol, con chuleta", CTX, DIA);

    expect(fondosSimples(interp)).toEqual([
      [1, "Frejoles", "Chuleta", null],
    ]);
    expect(interp.faltaProteina).toEqual([]);
  });

  it("separa 2 frejoles con chuleta y pollo en dos fondos", () => {
    const interp = interpretarFila(
      "2 frejoles uno con chuleta otro con pollo",
      CTX,
      DIA
    );

    expect(fondosSimples(interp)).toEqual([
      [1, "Frejoles", "Chuleta", null],
      [1, "Frejoles", "Pollo a la plancha", null],
    ]);
    expect(interp.total).toBe(24);
  });

  it("lee tallarín sin arroz por delivery pagando con yape", () => {
    const interp = interpretarFila(
      "1 tallarin sin arroz delivery yape",
      CTX,
      DIA
    );

    expect(interp.modo).toBe("delivery");
    expect(interp.pago).toBe("yape");
    expect(interp.total).toBe(13);
  });

  it("marca vacío y pone en dudas un plato que hoy no está", () => {
    const interp = interpretarFila("1 lomo saltado", CTX, DIA);

    expect(interp.vacio).toBe(true);
    expect(interp.total).toBe(0);
    expect(
      interp.dudas.some((d) => d.toLowerCase().includes("lomo saltado"))
    ).toBe(true);
  });

  it("incluye la sopa en los 3 ají pedidos", () => {
    const interp = interpretarFila("3 aji, todos con sopa de casa", CTX, DIA);

    expect(fondosSimples(interp)).toEqual([
      [3, "Ají de gallina", null, "Sopa de casa"],
    ]);
    expect(interp.total).toBe(36);
  });

  it("pide elegir la entrada cuando hay más de una", () => {
    const interp = interpretarFila("1 aji con entrada", CTX, DIA);

    expect(interp.faltaEntrada).toHaveLength(2);
  });

  it("entiende 'debe' como pago fiado", () => {
    const interp = interpretarFila("1 aji, debe", CTX, DIA);

    expect(interp.pago).toBe("fiado");
  });

  it("entiende 'despues pago' como pago fiado", () => {
    const interp = interpretarFila("1 aji, despues pago", CTX, DIA);

    expect(interp.pago).toBe("fiado");
  });

  it("entiende 'llevar efectivo' como recojo pagado en efectivo", () => {
    const interp = interpretarFila("1 aji llevar efectivo", CTX, DIA);

    expect(interp.pago).toBe("efectivo");
    expect(interp.modo).toBe("recojo");
  });

  it("cobra aparte una entrada y un adicional", () => {
    const interp = interpretarFila(
      "1 aji, 1 papa a la huancaina aparte, flan",
      CTX,
      DIA
    );

    expect(interp.lineas.entradas.map((e) => [e.cantidad, e.nombre])).toEqual([
      [1, "Papa a la huancaína"],
    ]);
    expect(
      interp.lineas.adicionales.map((a) => [a.cantidad, a.nombre])
    ).toEqual([[1, "Flan"]]);
    expect(interp.total).toBe(18.5);
  });

  it("duda del segundo cuando piden solo menús", () => {
    const interp = interpretarFila("2 menus", CTX, DIA);

    expect(interp.vacio).toBe(true);
    expect(
      interp.dudas.some((d) => d.toLowerCase().includes("no dice de qué segundo"))
    ).toBe(true);
  });

  it("el modo y pago elegidos en pantalla mandan sobre el texto", () => {
    const interp = interpretarFila("1 aji delivery", CTX, DIA, {
      modo: "recojo",
      pago: "yape",
    });

    expect(interp.modo).toBe("recojo");
    expect(interp.pago).toBe("yape");
    expect(interp.total).toBe(12);
  });

  it("los botones agregan texto y resuelven la proteína", () => {
    const interp = interpretarFila(
      agregarAlTexto("1 frejol", "con chuleta"),
      CTX,
      DIA
    );

    expect(interp.faltaProteina).toEqual([]);
  });

  it("los botones agregan texto y resuelven la entrada", () => {
    const interp = interpretarFila(
      agregarAlTexto("2 aji con entrada", "todos con sopa de casa"),
      CTX,
      DIA
    );

    expect(interp.faltaEntrada).toEqual([]);
    expect(interp.total).toBe(24);
  });
});

describe("agregarAlTexto", () => {
  it("agrega el primer pedazo a un texto vacío", () => {
    expect(agregarAlTexto("", "1 ají")).toBe("1 ají");
  });

  it("separa con coma los pedazos", () => {
    expect(agregarAlTexto("2 ají", "sopa")).toBe("2 ají, sopa");
  });

  it("no duplica la coma cuando el texto ya termina en coma", () => {
    expect(agregarAlTexto("2 ají, ", "sopa")).toBe("2 ají, sopa");
  });
});

describe("faltaParaAnotar", () => {
  it("pide el nombre del cliente", () => {
    expect(faltaParaAnotar("", {})).toContain("nombre");
  });

  it("pide lo que pidió cuando el pedido está vacío", () => {
    expect(faltaParaAnotar("Ana", { vacio: true })).toContain("pidió");
  });

  it("pide la proteína cuando falta", () => {
    const interp = {
      vacio: false,
      faltaProteina: [{ nombre: "Frejoles" }],
      faltaEntrada: [],
      pago: "yape",
    };
    expect(faltaParaAnotar("Ana", interp)).toContain("proteína");
  });

  it("pide elegir cómo paga cuando no hay pago", () => {
    const interp = {
      vacio: false,
      faltaProteina: [],
      faltaEntrada: [],
      pago: null,
    };
    expect(faltaParaAnotar("Ana", interp)).toContain("Elige cómo paga");
  });

  it("no pide nada cuando todo está completo", () => {
    const interp = interpretarFila("1 aji, yape", CTX, DIA);
    expect(faltaParaAnotar("Ana", interp)).toBe("");
  });
});

describe("resumenPedido", () => {
  it("resume fondos, entradas aparte y adicionales", () => {
    const resumen = resumenPedido({
      fondos: [
        {
          nombre: "Frejoles",
          cantidad: 2,
          proteina: "Chuleta",
          entradaIncluida: "Sopa de casa",
          arroz: "sin",
        },
      ],
      entradas: [{ nombre: "Sopa de casa", cantidad: 3 }],
      adicionales: [{ nombre: "Flan", cantidad: 1 }],
    });

    expect(resumen).toBe(
      "2 Frejoles (chuleta) sin arroz + sopa de casa · Sopa de casa aparte · Flan"
    );
  });
});

describe("armarLineas", () => {
  it("junta menús iguales sumando cantidades e ignora ids fuera del contexto", () => {
    const lineas = armarLineas(
      {
        menus: [
          {
            segundoId: "s-aji",
            proteina: "",
            entradaId: null,
            arroz: "con",
            cantidad: 1,
          },
          {
            segundoId: "s-aji",
            proteina: "",
            entradaId: null,
            arroz: "con",
            cantidad: 2,
          },
        ],
        entradasExtra: [{ id: "e-inexistente", cantidad: 5 }],
        adicionales: [{ id: "x-inexistente", cantidad: 1 }],
      },
      CTX
    );

    expect(lineas.fondos).toEqual([
      {
        platoId: "s-aji",
        nombre: "Ají de gallina",
        cantidad: 3,
        arroz: "con",
      },
    ]);
    expect(lineas.entradas).toEqual([]);
    expect(lineas.adicionales).toEqual([]);
  });
});
