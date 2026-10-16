/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Paleta completa con nombre. Antes cada componente repetía valores
      // hexadecimales sueltos (bg-[#FBF6EC], text-[#6E6253], etc.) — ahora
      // todos apuntan a estos mismos nombres, así que cambiar un color de
      // marca se hace en un solo lugar en vez de buscar en 20+ archivos.
      colors: {
        crema: "#FBF6EC",
        "crema-hover": "#f7f1e3",
        tinta: "#2B2622",
        "tinta-oscura": "#211B16",
        "tinta-media": "#332A21",
        terracota: "#C1452D",
        "terracota-oscura": "#a93a25",
        salvia: "#5C7A4F",
        "salvia-oscura": "#4d6841",
        ocre: "#9C7A3C",
        dorado: "#E0A95C",
        arena: "#e8ddc8",
        "arena-oscura": "#dccdb4",
        "arena-punteada": "#e0d3b8",
        "arena-hover": "#d8c8a6",
        divisor: "#f0e8d6",
        etiqueta: "#6b5f52",
        "texto-secundario": "#6E6253",
        "texto-terciario": "#998C76",
        "texto-inactivo": "#5c5246",
        "numero-inactivo": "#B8A684",
        "input-bg": "#FFFDF8",
      },
      boxShadow: {
        card: "0 2px 10px rgba(43,38,34,0.05)",
        floating: "0 8px 24px rgba(43,38,34,0.08)",
        active: "0 2px 8px rgba(193,69,45,0.12)",
        // Sombra "mecánica" para los botones principales: un borde grueso
        // abajo que simula el grosor de un botón físico. La variante
        // "-active" (más plana, sin borde) es la que se ve al presionar,
        // dando la sensación de que el botón se hunde de verdad.
        cta: "0 4px 0 #8f331f, 0 6px 14px rgba(193,69,45,0.25)",
        "cta-active": "0 1px 2px rgba(193,69,45,0.25)",
        "cta-salvia": "0 4px 0 #3d5c33, 0 6px 14px rgba(92,122,79,0.25)",
        "cta-salvia-active": "0 1px 2px rgba(92,122,79,0.25)",
        "cta-tinta": "0 4px 0 #211B16, 0 6px 14px rgba(43,38,34,0.3)",
        "cta-tinta-active": "0 1px 2px rgba(43,38,34,0.3)",
      },
      keyframes: {
        pop: {
          "0%, 100%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.035)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        sube: {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        brilla: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(193,69,45,0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(193,69,45,0.25)" },
        },
      },
      animation: {
        // Resorte con rebote (confirmado en el mockup) en vez de un simple
        // "ease" — se siente vivo, no mecánico ni plano.
        pop: "pop 260ms cubic-bezier(0.34,1.56,0.64,1)",
        shimmer: "shimmer 1.1s ease-in-out infinite",
        fade: "fade 180ms ease-out",
        sube: "sube 260ms cubic-bezier(0.22,1,0.36,1)",
        brilla: "brilla 1.2s ease-in-out 3",
      },
    },
  },
  plugins: [],
};