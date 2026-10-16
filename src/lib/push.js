// src/lib/push.js
// Notificaciones push de pedidos nuevos (gratis, con Web Push estándar).
// El celular se suscribe con la clave pública que entrega la Edge Function
// "notificar-pedido", y la suscripción se guarda en Supabase con una función
// RPC (la tabla no se puede leer desde el navegador).
import { supabase } from "../supabaseClient";

const FUNCION = "notificar-pedido";

export function pushSoportado() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// iPhone/iPad solo permiten notificaciones si la app está instalada en la
// pantalla de inicio.
export function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function estaInstalada() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.error("No se pudo registrar el service worker:", e);
    return null;
  }
}

async function registro() {
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registrarServiceWorker());
  if (!reg) throw new Error("Este navegador no permite notificaciones.");
  return navigator.serviceWorker.ready;
}

function b64urlABytes(texto) {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesAB64url(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function llamarFuncion(body) {
  const { data, error } = await supabase.functions.invoke(FUNCION, { body });
  if (error) {
    let detalle = "";
    try {
      detalle = (await error.context?.json())?.error || "";
    } catch {
      /* sin detalle */
    }
    throw new Error(detalle || error.message || "No se pudo conectar con el servidor.");
  }
  return data;
}

function nombreDispositivo() {
  const ua = navigator.userAgent;
  const modelo = ua.match(/Android [\d.]+; ([^;)]+)/)?.[1];
  if (modelo) return `Android · ${modelo.replace(/ Build.*/, "").trim()}`;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "Mac";
  return "Navegador";
}

// Estado actual en ESTE celular: "no-soportado" | "bloqueadas" | "activas" | "inactivas"
export async function estadoNotificaciones() {
  if (!pushSoportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueadas";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "activas" : "inactivas";
}

export async function activarNotificaciones() {
  if (!pushSoportado()) {
    throw new Error(
      esIOS() && !estaInstalada()
        ? "En iPhone primero instala la app (Compartir → Agregar a inicio) y ábrela desde el ícono."
        : "Este navegador no permite notificaciones. Usa Google Chrome."
    );
  }
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error("No diste permiso. Actívalo en Ajustes del celular → Notificaciones → Chrome / Cocina de Mamá.");
  }
  const reg = await registro();
  const { publicKey } = await llamarFuncion({ tipo: "clave" });
  const clave = b64urlABytes(publicKey);

  let sub = await reg.pushManager.getSubscription();
  // Si la suscripción es de otra clave (por ejemplo, se cambiaron las
  // claves del servidor), se rehace.
  if (sub) {
    const actual = sub.options?.applicationServerKey;
    if (actual && bytesAB64url(actual) !== publicKey) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave });
  }
  const json = sub.toJSON();
  const { error } = await supabase.rpc("registrar_suscripcion", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_dispositivo: nombreDispositivo(),
  });
  if (error) throw new Error("No se pudo guardar la suscripción. Revisa tu conexión.");
  return sub;
}

export async function desactivarNotificaciones() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.rpc("quitar_suscripcion", { p_endpoint: sub.endpoint });
  await sub.unsubscribe();
}

export async function enviarPrueba() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) throw new Error("Primero activa las notificaciones en este celular.");
  return llamarFuncion({ tipo: "prueba", endpoint: sub.endpoint });
}
