// src/lib/imagenMenu.js
// Dibuja el menú de hoy como una imagen vertical de 1080×1920 (tamaño de
// estado de WhatsApp / historia), todo en el navegador con <canvas>.
import { fechaLabel } from "../data";
import { soles } from "../utils/pedidos";
import { WHATSAPP_NUMBER } from "../utils/contacto";
import { categoriaInfo } from "./catalogo";

const W = 1080;
const H = 1920;
const C = {
  crema: "#FBF6EC",
  tinta: "#2B2622",
  tintaMedia: "#332A21",
  tintaOscura: "#211B16",
  terracota: "#C1452D",
  terracotaOscura: "#a93a25",
  salvia: "#5C7A4F",
  ocre: "#9C7A3C",
  dorado: "#E0A95C",
  arena: "#e8ddc8",
  gris: "#6E6253",
};
const SERIF = "Fraunces, Georgia, serif";
const SANS = "Inter, Arial, sans-serif";

export const COLORES_CATEGORIA = {
  entrada: ["#7E9A6B", "#5C7A4F"],
  segundo: ["#D3634A", "#A93A25"],
  postre: ["#E3B26D", "#B9853A"],
  bebida: ["#C77B8E", "#8E4A63"],
  adicional: ["#A89272", "#7A6548"],
};

function cargarImagen(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rectRedondo(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dibuja la foto recortada para llenar el cuadrado (como object-fit: cover),
// o un fondo de color con el emoji de la categoría si no hay foto.
function dibujarMiniatura(ctx, img, categoria, x, y, s) {
  ctx.save();
  rectRedondo(ctx, x, y, s, s, s * 0.2);
  ctx.clip();
  if (img) {
    const escala = Math.max(s / img.naturalWidth, s / img.naturalHeight);
    const w = img.naturalWidth * escala;
    const h = img.naturalHeight * escala;
    ctx.drawImage(img, x + (s - w) / 2, y + (s - h) / 2, w, h);
  } else {
    const [a, b] = COLORES_CATEGORIA[categoria] || COLORES_CATEGORIA.segundo;
    const g = ctx.createLinearGradient(x, y, x + s, y + s);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, s, s);
    ctx.font = `${Math.round(s * 0.5)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(categoriaInfo(categoria).emoji, x + s / 2, y + s / 2 + s * 0.03);
  }
  ctx.restore();
}

// Corta el texto en líneas que entran en "ancho". Si sobran líneas, la
// última termina en "…".
function partirTexto(ctx, texto, ancho, maxLineas) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = p;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > maxLineas) {
    const cortadas = lineas.slice(0, maxLineas);
    let ultima = cortadas[maxLineas - 1];
    while (ctx.measureText(`${ultima}…`).width > ancho && ultima.length > 1) ultima = ultima.slice(0, -1);
    cortadas[maxLineas - 1] = `${ultima.trim()}…`;
    return cortadas;
  }
  return lineas;
}

function tituloSeccion(ctx, texto, y) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.terracota;
  ctx.font = `700 30px ${SANS}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
  ctx.fillText(texto.toUpperCase(), 80, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  const ancho = ctx.measureText(texto.toUpperCase()).width + texto.length * 6;
  ctx.strokeStyle = C.arena;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80 + ancho + 24, y - 10);
  ctx.lineTo(W - 80, y - 10);
  ctx.stroke();
}

export async function generarImagenMenu(menuHoy) {
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`600 60px Fraunces`),
      document.fonts.load(`700 60px Fraunces`),
      document.fonts.load(`500 30px Inter`),
      document.fonts.load(`600 30px Inter`),
      document.fonts.load(`700 30px Inter`),
    ]).catch(() => {});
  }

  const entradas = menuHoy.entradas.filter((x) => !x.item.agotado);
  const segundos = menuHoy.segundos.filter((x) => !x.item.agotado);
  const extras = menuHoy.extras.filter((x) => !x.item.agotado);
  const dia = menuHoy.dia;

  const [logo, ...fotos] = await Promise.all([
    cargarImagen("/icons/icon-192.png"),
    ...[...entradas, ...segundos].map((x) => cargarImagen(x.plato.fotoUrl)),
  ]);
  const fotoDe = new Map([...entradas, ...segundos].map((x, i) => [x.plato.id, fotos[i]]));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ---------- Fondo ----------
  ctx.fillStyle = C.crema;
  ctx.fillRect(0, 0, W, H);

  // ---------- Encabezado ----------
  const altoHeader = 470;
  const gh = ctx.createLinearGradient(0, 0, 0, altoHeader);
  gh.addColorStop(0, C.tintaMedia);
  gh.addColorStop(1, C.tintaOscura);
  ctx.fillStyle = gh;
  ctx.fillRect(0, 0, W, altoHeader);
  // brillo cálido
  const brillo = ctx.createRadialGradient(W - 120, 40, 10, W - 120, 40, 420);
  brillo.addColorStop(0, "rgba(193,69,45,0.45)");
  brillo.addColorStop(1, "rgba(193,69,45,0)");
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, W, altoHeader);

  if (logo) {
    ctx.save();
    rectRedondo(ctx, 80, 80, 112, 112, 26);
    ctx.clip();
    ctx.drawImage(logo, 80, 80, 112, 112);
    ctx.restore();
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.crema;
  ctx.font = `600 66px ${SERIF}`;
  ctx.fillText("Cocina de Mamá", 222, 156);

  ctx.fillStyle = C.dorado;
  ctx.font = `600 30px ${SANS}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
  ctx.fillText("MENÚ DE HOY", 80, 290);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.fillStyle = C.crema;
  ctx.font = `600 72px ${SERIF}`;
  ctx.fillText(fechaLabel(menuHoy.fecha), 80, 380);

  // ---------- Cinta de precio ----------
  let y = altoHeader - 30;
  if (dia) {
    const altoCinta = 150;
    ctx.save();
    ctx.shadowColor = "rgba(143,51,31,0.35)";
    ctx.shadowOffsetY = 10;
    ctx.shadowBlur = 24;
    ctx.fillStyle = C.terracota;
    rectRedondo(ctx, 60, y, W - 120, altoCinta, 36);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.font = `700 64px ${SERIF}`;
    ctx.fillText(soles(dia.precioRecojo), 110, y + 92);
    const anchoPrecio = ctx.measureText(soles(dia.precioRecojo)).width;
    ctx.font = `500 28px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("Entrada + segundo", 110 + anchoPrecio + 30, y + 66);
    ctx.fillText(dia.refresco?.trim() ? `+ ${dia.refresco.trim()}` : "+ refresco", 110 + anchoPrecio + 30, y + 104);
    ctx.textAlign = "right";
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText("DELIVERY", W - 110, y + 62);
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText(soles(dia.precioDelivery), W - 110, y + 106);
    y += altoCinta + 80;
  } else {
    y += 110;
  }

  // ---------- Platos ----------
  const pie = 220;
  const finCuerpo = H - pie - 40;
  const altoTitulos = (entradas.length ? 76 : 0) + (segundos.length ? 76 : 0) + (extras.length ? 150 : 0);
  const filas = entradas.length + segundos.length;
  const disponible = finCuerpo - y - altoTitulos;
  // Si hay muchas entradas, van en dos columnas para que todo entre.
  const entradasEnDosCol = filas > 0 && disponible / filas < 110 && entradas.length > 1;
  const filasReales = (entradasEnDosCol ? Math.ceil(entradas.length / 2) : entradas.length) + segundos.length;
  const altoFila = Math.max(78, Math.min(190, filasReales ? disponible / filasReales : 0));
  const mini = Math.round(altoFila - 22);

  const dibujarFila = ({ item, plato }, x, yy, ancho) => {
    dibujarMiniatura(ctx, fotoDe.get(plato.id), plato.categoria, x, yy, mini);
    const tx = x + mini + 28;
    const anchoTexto = ancho - mini - 28;
    const opciones = plato.requiereProteina ? item.proteinas : [];
    const tam = Math.max(30, Math.min(46, mini * 0.3));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${tam}px ${SERIF}`;
    const lineas = partirTexto(ctx, plato.nombre.trim(), anchoTexto, opciones.length || mini < 110 ? 1 : 2);
    const sub = opciones.length ? `Con ${opciones.join(" o ")}` : "";
    const altoBloque = lineas.length * tam * 1.15 + (sub ? tam * 0.95 : 0);
    let ty = yy + mini / 2 - altoBloque / 2 + tam * 0.9;
    ctx.fillStyle = C.tinta;
    lineas.forEach((ln) => {
      ctx.fillText(ln, tx, ty);
      ty += tam * 1.15;
    });
    if (sub) {
      ctx.fillStyle = C.ocre;
      ctx.font = `500 ${Math.round(tam * 0.66)}px ${SANS}`;
      ctx.fillText(partirTexto(ctx, sub, anchoTexto, 1)[0], tx, ty - tam * 0.2);
    }
  };

  if (entradas.length) {
    tituloSeccion(ctx, "Entradas", y + 34);
    y += 76;
    if (entradasEnDosCol) {
      const anchoCol = (W - 160 - 40) / 2;
      entradas.forEach((x, i) => {
        const col = i % 2;
        const fila = Math.floor(i / 2);
        dibujarFila(x, 80 + col * (anchoCol + 40), y + fila * altoFila, anchoCol);
      });
      y += Math.ceil(entradas.length / 2) * altoFila;
    } else {
      entradas.forEach((x) => {
        dibujarFila(x, 80, y, W - 160);
        y += altoFila;
      });
    }
  }
  if (segundos.length) {
    tituloSeccion(ctx, "Segundos", y + 34);
    y += 76;
    segundos.forEach((x) => {
      dibujarFila(x, 80, y, W - 160);
      y += altoFila;
    });
  }
  if (extras.length) {
    tituloSeccion(ctx, "Extras", y + 34);
    y += 64;
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = C.gris;
    ctx.textAlign = "left";
    const texto = extras.map(({ plato }) => `${plato.nombre.trim()} ${soles(plato.precioExtra)}`).join("  ·  ");
    partirTexto(ctx, texto, W - 160, 2).forEach((ln, i) => ctx.fillText(ln, 80, y + 30 + i * 40));
  }

  // ---------- Pie ----------
  const gp = ctx.createLinearGradient(0, H - pie, 0, H);
  gp.addColorStop(0, C.tintaMedia);
  gp.addColorStop(1, C.tintaOscura);
  ctx.fillStyle = gp;
  ctx.fillRect(0, H - pie, W, pie);
  ctx.textAlign = "center";
  ctx.fillStyle = C.dorado;
  ctx.font = `600 30px ${SANS}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
  ctx.fillText("PIDE DESDE TU CELULAR", W / 2, H - pie + 66);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.fillStyle = C.crema;
  ctx.font = `600 50px ${SERIF}`;
  ctx.fillText("cocina-mama-roan.vercel.app", W / 2, H - pie + 132);
  ctx.fillStyle = "#cfc3ad";
  ctx.font = `500 30px ${SANS}`;
  const numero = WHATSAPP_NUMBER.replace(/^51/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  ctx.fillText(`WhatsApp ${numero}`, W / 2, H - pie + 184);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo crear la imagen."))), "image/jpeg", 0.92)
  );
}

export function nombreArchivoMenu(fecha) {
  return `menu-cocina-de-mama-${fecha}.jpg`;
}
