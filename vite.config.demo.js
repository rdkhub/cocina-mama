// Vista de prueba con datos inventados: `npm run demo`.
// Cambia src/supabaseClient.js por demo/supabaseFalso.js, así se puede ver y
// probar la app sin conectarse a la base de datos real.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const falso = fileURLToPath(new URL("./demo/supabaseFalso.js", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^.*\/supabaseClient(\.js)?$/, replacement: falso }],
  },
  server: { port: 5180, strictPort: true },
});
