// Menú inventado para los tests (no son datos reales del negocio).
export const DIA = { precioRecojo: 12, precioDelivery: 13, precioEntradaExtra: 3 };

export const CTX = {
  segundos: [
    { id: "s-aji", nombre: "Ají de gallina", proteinas: [], requiereProteina: false, permiteArroz: true },
    { id: "s-frejol", nombre: "Frejoles", proteinas: ["Chuleta", "Pollo a la plancha"], requiereProteina: true, permiteArroz: true },
    { id: "s-tallarin", nombre: "Tallarines verdes", proteinas: [], requiereProteina: false, permiteArroz: false },
  ],
  entradas: [
    { id: "e-sopa", nombre: "Sopa de casa" },
    { id: "e-papa", nombre: "Papa a la huancaína" },
  ],
  extras: [
    { id: "x-chicha", nombre: "Chicha morada", precio: 2 },
    { id: "x-flan", nombre: "Flan", precio: 3.5 },
  ],
  catalogo: [
    { id: "s-aji", nombre: "Ají de gallina" },
    { id: "s-frejol", nombre: "Frejoles" },
    { id: "s-tallarin", nombre: "Tallarines verdes" },
    { id: "s-lomo", nombre: "Lomo saltado" },
    { id: "e-sopa", nombre: "Sopa de casa" },
    { id: "e-papa", nombre: "Papa a la huancaína" },
    { id: "x-chicha", nombre: "Chicha morada" },
    { id: "x-flan", nombre: "Flan" },
  ],
};
