/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Colores con nombre en vez de hexadecimales sueltos repetidos en 20+
      // archivos. De ahora en adelante, los componentes NUEVOS deberían usar
      // estos (ej: bg-crema en vez de bg-[#FBF6EC]). Los archivos existentes
      // se pueden migrar en una pasada aparte más adelante, sin apuro.
      colors: {
        crema: "#FBF6EC",
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
      },
      // Las 3 sombras que ya usaba la app repetidas como valores arbitrarios,
      // ahora con nombre: shadow-card, shadow-floating, shadow-active.
      boxShadow: {
        card: "0 2px 10px rgba(43,38,34,0.05)",
        floating: "0 8px 24px rgba(43,38,34,0.08)",
        active: "0 2px 8px rgba(193,69,45,0.12)",
      },
      keyframes: {
        pop: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        pop: "pop 220ms ease",
        shimmer: "shimmer 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
