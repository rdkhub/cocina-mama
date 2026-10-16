// supabase/functions/notificar-pedido/webpush.ts
//
// Web Push sin dependencias: cifrado aes128gcm (RFC 8291) y firma VAPID
// (RFC 8292) usando solo WebCrypto, que ya trae el runtime de Supabase.

const enc = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;
const texto8 = (t: string): Bytes => new Uint8Array(enc.encode(t));

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(texto: string): Bytes {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texto.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...partes: Uint8Array[]): Bytes {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hmac(clave: Bytes, datos: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos));
}

// HKDF (RFC 5869) para salidas de hasta 32 bytes.
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, largo: number): Promise<Bytes> {
  const prk = await hmac(salt, ikm);
  const t1 = await hmac(prk, concat(info, new Uint8Array([1])));
  return t1.slice(0, largo);
}

export type VapidJwks = { publicKey: JsonWebKey; privateKey: JsonWebKey };

export type ClavesVapid = { privada: CryptoKey; publicaRaw: Bytes };

export async function importarVapid(jwks: VapidJwks): Promise<ClavesVapid> {
  const privada = await crypto.subtle.importKey(
    "jwk",
    { ...jwks.privateKey, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const publicaRaw = concat(new Uint8Array([4]), b64urlDecode(jwks.publicKey.x!), b64urlDecode(jwks.publicKey.y!));
  return { privada, publicaRaw };
}

async function firmarJwtVapid(claves: ClavesVapid, audiencia: string, contacto: string): Promise<string> {
  const header = b64urlEncode(texto8(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(
    texto8(JSON.stringify({ aud: audiencia, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contacto })),
  );
  const firma = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, claves.privada, texto8(`${header}.${claims}`)),
  );
  return `${header}.${claims}.${b64urlEncode(firma)}`;
}

// Cifra el mensaje para una suscripción (RFC 8291, un solo registro).
export async function cifrar(texto: string, p256dh: string, auth: string): Promise<Bytes> {
  const uaPublica = b64urlDecode(p256dh);
  const secretoAuth = b64urlDecode(auth);

  // Par de claves efímero, uno nuevo por mensaje.
  const efimero = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublica = new Uint8Array(await crypto.subtle.exportKey("raw", efimero.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublica, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, efimero.privateKey, 256),
  );

  const keyInfo = concat(texto8("WebPush: info\0"), uaPublica, asPublica);
  const ikm = await hkdf(secretoAuth, ecdh, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, texto8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, texto8("Content-Encoding: nonce\0"), 12);

  const claveAes = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const relleno = concat(texto8(texto), new Uint8Array([2])); // 0x02 = último registro
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, claveAes, relleno));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublica.length]), asPublica, cifrado);
}

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };

// Envía el mensaje y devuelve el código HTTP del servicio de push
// (201 = entregado al servicio; 404/410 = suscripción que ya no existe).
export async function enviarPush(
  sub: Suscripcion,
  texto: string,
  claves: ClavesVapid,
  contacto: string,
  { ttl = 6 * 3600, urgencia = "high" }: { ttl?: number; urgencia?: string } = {},
): Promise<number> {
  const cuerpo = await cifrar(texto, sub.p256dh, sub.auth);
  const jwt = await firmarJwtVapid(claves, new URL(sub.endpoint).origin, contacto);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttl),
      Urgency: urgencia,
      Authorization: `vapid t=${jwt}, k=${b64urlEncode(claves.publicaRaw)}`,
    },
    body: cuerpo,
  });
  await res.body?.cancel();
  return res.status;
}
