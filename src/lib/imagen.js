// src/lib/imagen.js
// Comprime una foto en el navegador antes de subirla, para no gastar el
// espacio gratis de Supabase Storage: lado mayor de 900px, formato WebP y
// bajando la calidad hasta quedar por debajo de ~200 KB.

const LIMITE_BYTES = 200 * 1024;
const LADO_MAXIMO = 900;

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen. Prueba con otra foto."));
    };
    img.src = url;
  });
}

function canvasABlob(canvas, tipo, calidad) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

export async function comprimirFoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }
  const img = await cargarImagen(file);

  let lado = LADO_MAXIMO;
  let mejor = null;

  // Hasta 3 tamaños × 5 calidades. Normalmente sale en el primer o segundo intento.
  for (let intentoTam = 0; intentoTam < 3; intentoTam++) {
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * escala);
    const h = Math.round(img.naturalHeight * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    for (const calidad of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      let blob = await canvasABlob(canvas, "image/webp", calidad);
      // Algunos navegadores viejos no generan WebP y devuelven PNG: en ese caso JPEG.
      if (!blob || blob.type !== "image/webp") {
        blob = await canvasABlob(canvas, "image/jpeg", calidad);
      }
      if (!blob) continue;
      mejor = blob;
      if (blob.size <= LIMITE_BYTES) return blob;
    }
    lado = Math.round(lado * 0.75);
  }
  if (!mejor) throw new Error("No se pudo comprimir la imagen.");
  return mejor;
}
