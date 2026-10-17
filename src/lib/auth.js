// src/lib/auth.js
// Acceso al panel de mamá con Supabase Auth. El "PIN" es la contraseña de un
// único usuario administrador; la base de datos (RLS) solo deja leer pedidos
// o cambiar el menú a los correos de la tabla "admins". Así, aunque alguien
// abra el candado o mire el código, sin el PIN no puede hacer nada.
import { supabase } from "../supabaseClient";

export const ADMIN_EMAIL = "admin@cocinademama.pe";
export const PIN_MINIMO = 6;
export const PIN_MAXIMO = 8;

export async function esAdmin() {
  const { data, error } = await supabase.rpc("es_admin");
  return !error && data === true;
}

// ¿Este celular ya tiene una sesión de admin válida? (la sesión queda guardada,
// así el papá pone el PIN una vez y al tocar una notificación entra directo).
export async function sesionAdminActiva() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  if (await esAdmin()) return true;
  await supabase.auth.signOut();
  return false;
}

export async function entrarConPin(pin) {
  const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: pin });
  if (error) {
    if (error.status === 429) throw new Error("Demasiados intentos. Espera unos minutos.");
    if (error.status === 400) throw new Error("PIN incorrecto");
    throw new Error("No se pudo conectar. Revisa tu internet.");
  }
  if (!(await esAdmin())) {
    await supabase.auth.signOut();
    throw new Error("Esta cuenta no tiene acceso al panel");
  }
}

export async function salir() {
  await supabase.auth.signOut();
}
