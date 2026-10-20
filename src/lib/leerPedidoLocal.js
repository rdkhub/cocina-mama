// src/lib/leerPedidoLocal.js
// Lector de pedidos de WhatsApp que funciona sin internet ni IA. Compara cada
// pedazo del mensaje con los platos del menú de HOY, tolerando faltas de
// ortografía ("aji d gayina", "saltao", "pure c asado"). Lo que no entiende lo
// devuelve en "dudas" para que el papá lo elija a mano.
//
// contexto: {
//   segundos: [{ id, nombre, proteinas: [], requiereProteina, permiteArroz }],
//   entradas: [{ id, nombre }],
//   extras:   [{ id, nombre, precio }],
// }
// Devuelve: { nombre, menus: [{ segundoId, proteina, entradaId, arroz, cantidad }],
//   entradasExtra: [{ id, cantidad }], adicionales: [{ id, cantidad }],
//   modo, direccion, pago, notas, dudas: [] }

const VACIAS = new Set([
  "de", "del", "con", "c", "a", "al", "la", "el", "lo", "los", "las", "y", "e", "en", "un", "una", "uno", "por", "para", "pa",
  "mi", "me", "su", "o", "u", "q", "que", "porfa", "porfavor", "favor", "xfa", "plis", "pls",
]);

const NUMEROS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  par: 2,
};

// Palabras que se escriben de muchas formas. Se normalizan antes de comparar.
const SINONIMOS = [
  [/\bd\b/g, "de"],
  [/\bc\/\b/g, "con "],
  [/\bk\b/g, "que"],
  [/\bxq\b/g, "porque"],
  [/\bsaltao\b/g, "saltado"],
  [/\bpure\b/g, "pure"],
  [/\bchaufita\b/g, "chaufa"],
  [/\bsopita\b/g, "sopa"],
  [/\bentradita\b/g, "entrada"],
  [/\bsegundito\b/g, "segundo"],
  [/\bmenusito\b/g, "menu"],
  [/\bmenucito\b/g, "menu"],
  [/\bdeliveri\b|\bdelibery\b|\bdeli\b|\bdelivey\b|\bdelivri\b/g, "delivery"],
  [/\bplancha\b/g, "plancha"],
  [/\bpollito\b/g, "pollo"],
  [/\bchuletita\b/g, "chuleta"],
  [/\bbisteck?\b|\bbistek\b|\bbiste\b/g, "bistec"],
];

export function normalizar(texto) {
  let t = (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n");
  t = t.replace(/[^a-z0-9/#\n,.;+]/g, " ");
  for (const [re, rep] of SINONIMOS) t = t.replace(re, rep);
  return t.replace(/[ \t]+/g, " ").trim();
}

const palabras = (t) => normalizar(t).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
const significativas = (t) => palabras(t).filter((p) => !VACIAS.has(p));

function distancia(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  const fila = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = fila[0];
    fila[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return fila[n];
}

// ¿La palabra escrita por el cliente corresponde a la palabra del plato?
function parecidas(escrita, delPlato) {
  if (escrita === delPlato) return 1;
  if (escrita.length >= 4 && delPlato.startsWith(escrita)) return 0.9; // "chauf" → chaufa
  if (delPlato.length >= 4 && escrita.startsWith(delPlato)) return 0.9; // "saltados" → saltado
  // Diminutivos: "cevichito", "sopita", "tallarincito", "pollito"
  const raiz = escrita.replace(/(c?it[oa]s?)$/, "");
  if (raiz !== escrita && raiz.length >= 4 && delPlato.startsWith(raiz)) return 0.88;
  // "gayina"/"gallina", "chicharon"/"chicharron"
  const a = escrita.replace(/ll/g, "y").replace(/rr/g, "r").replace(/v/g, "b").replace(/z/g, "s").replace(/h/g, "");
  const b = delPlato.replace(/ll/g, "y").replace(/rr/g, "r").replace(/v/g, "b").replace(/z/g, "s").replace(/h/g, "");
  if (a === b) return 0.95;
  const largo = Math.max(a.length, b.length);
  if (largo < 4) return 0;
  const sim = 1 - distancia(a, b) / largo;
  return sim >= 0.72 ? sim : 0;
}

// Palabras de proteína o acompañamiento: aparecen en muchos platos, así que
// solas no sirven para saber cuál pidió ("con pollo" no es "Saltado de pollo").
const GENERICAS = new Set([
  "pollo", "carne", "chancho", "cerdo", "res", "pescado", "chuleta", "bistec", "milanesa", "hamburguesa", "plancha", "frito", "frita",
  "broaster", "arroz", "papa", "papas", "yuca", "ensalada", "sancochada", "sancochadas", "salsa", "criolla", "asado", "pavita",
]);

// Qué tan bien un pedazo de texto nombra a un plato (0 a 1). "unicas" son las
// palabras que solo tiene ese plato dentro de la lista (p. ej. "huancaina").
function puntaje(tokens, nombrePlato, unicas) {
  const clave = significativas(nombrePlato);
  if (!clave.length) return 0;
  let suma = 0;
  let primera = 0;
  let distintiva = 0;
  clave.forEach((c, idx) => {
    let mejor = 0;
    for (const t of tokens) mejor = Math.max(mejor, parecidas(t, c));
    suma += mejor;
    if (idx === 0) primera = mejor;
    if (unicas?.has(c) && !GENERICAS.has(c) && c.length >= 4) distintiva = Math.max(distintiva, mejor);
  });
  const cobertura = suma / clave.length;
  // La primera palabra suele ser la que distingue el plato ("saltado", "aji",
  // "pure"). Si solo coincide una palabra secundaria ("pollo"), vale menos.
  const base = primera > 0 && !GENERICAS.has(clave[0]) ? Math.max(cobertura, 0.55 * primera + 0.45 * cobertura) : cobertura * 0.6;
  return Math.max(base, distintiva * 0.8);
}

function palabrasUnicas(lista) {
  const cuenta = new Map();
  for (const it of lista) for (const p of new Set(significativas(it.nombre))) cuenta.set(p, (cuenta.get(p) || 0) + 1);
  return new Map(lista.map((it) => [it, new Set(significativas(it.nombre).filter((p) => cuenta.get(p) === 1))]));
}

function mejorCoincidencia(tokens, lista, minimo = 0.5) {
  let mejor = null;
  let segundo = null;
  const unicas = palabrasUnicas(lista);
  for (const item of lista) {
    const p = puntaje(tokens, item.nombre, unicas.get(item));
    if (!mejor || p > mejor.p) {
      segundo = mejor;
      mejor = { item, p };
    } else if (!segundo || p > segundo.p) {
      segundo = { item, p };
    }
  }
  if (!mejor || mejor.p < minimo) return null;
  return { ...mejor, empate: segundo && segundo.p >= minimo && mejor.p - segundo.p < 0.08 ? segundo.item : null };
}

function cantidadEn(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^\d{1,2}$/.test(t)) {
      const n = Number(t);
      if (n >= 1 && n <= 30) return n;
    }
    if (t in NUMEROS) {
      // "un saltado" = 1, pero "uno de pollo" también; "par de" = 2
      return NUMEROS[t];
    }
  }
  return null;
}

function elegirProteina(tokens, opciones) {
  const puntos = opciones.map((prot) => {
    const clave = significativas(prot);
    let suma = 0;
    let primera = 0;
    clave.forEach((c, i) => {
      let mejor = 0;
      for (const t of tokens) mejor = Math.max(mejor, parecidas(t, c));
      suma += mejor;
      if (i === 0) primera = mejor;
    });
    return { prot, p: clave.length ? Math.max(suma / clave.length, primera * 0.7) : 0 };
  });
  puntos.sort((a, b) => b.p - a.p);
  const [a, b] = puntos;
  if (!a || a.p < 0.5) return "";
  // "pollo" solo con "Pollo a la plancha" y "Pollo frito": no se adivina.
  if (b && a.p - b.p < 0.1) return "";
  return a.prot;
}

// Quita encabezados que WhatsApp agrega al copiar o compartir varios mensajes:
// "[19/10/26, 12:30 p. m.] Juan Pérez: ..." o "19/10/26 12:30 - Juan: ..."
function limpiarWhatsApp(texto) {
  const nombres = {};
  const lineas = (texto || "").split(/\r?\n/).map((l) => {
    const m =
      l.match(/^\s*\[[^\]]{4,40}\]\s*([^:]{1,40}):\s*(.*)$/) ||
      l.match(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}[^-]{0,12}-\s*([^:]{1,40}):\s*(.*)$/);
    if (m) {
      const n = m[1].trim();
      nombres[n] = (nombres[n] || 0) + 1;
      return m[2];
    }
    return l;
  });
  const nombre = Object.entries(nombres).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  return { cuerpo: lineas.join("\n"), nombre: /^\+?\d[\d\s]+$/.test(nombre) ? "" : nombre, telefono: /^\+?\d[\d\s]+$/.test(nombre) ? nombre.replace(/\D/g, "").slice(-9) : "" };
}

const RE_DIRECCION = /\b(jr|jiron|av|avenida|calle|ca|psje|pasaje|mz|manzana|lote|lt|urb|urbanizacion|dpto|depa|departamento|edificio|edif|piso|block|interior|int|condominio|residencial|cuadra|cdra|frente|altura)\b|#\s*\d/;

function detectarModo(norm) {
  if (/\b(recojo|recoger|recogo|paso a recoger|paso a las|paso como a las|paso al rato|paso en un rato|voy a pasar|paso yo|paso por|voy por|voy a recoger|para llevar|pa llevar|lo recojo|me acerco|paso a buscar)\b/.test(norm)) {
    return "recojo";
  }
  if (/\b(delivery|enviame|envia|envias|mandame|mandas|manda|traeme|traes|me lo llevas|llevame|me lo mandas|a mi casa|a la casa|a mi oficina|a mi trabajo)\b/.test(norm)) {
    return "delivery";
  }
  if (RE_DIRECCION.test(norm)) return "delivery";
  return null;
}

function detectarPago(norm) {
  if (/\b(yape|yapeo|yapear|yapeado|yapee|yapie|plin|plineo|transferencia|transfiero)\b/.test(norm)) return "yape";
  if (/\b(apunta|apuntame|apuntalo|apuntamelo|anota|anotame|anotalo|anotamelo|apuntas|anotas|fiado|fiao|a cuenta|en la cuenta|a mi cuenta|despues pago|despues te pago|luego pago|luego te pago|fin de mes|quincena|te debo|le debo|pago manana)\b/.test(norm)) {
    return "fiado";
  }
  if (/\b(efectivo|cash|sencillo|vuelto|billete|en mano|al contado|contra entrega)\b/.test(norm)) return "efectivo";
  return null;
}

const RE_DIRECCION_ORIGINAL =
  /(?:^|[\s,.:;(])((?:jr|jir[oó]n|av|avenida|calle|psje|pasaje|mz|manzana|urb|urbanizaci[oó]n|condominio|residencial|edificio|edif|block|cuadra|cdra)\b\.?[^\n]*)/i;

function detectarDireccion(cuerpo) {
  for (const linea of cuerpo.split(/\n/)) {
    const m = linea.match(RE_DIRECCION_ORIGINAL);
    if (m) {
      return m[1]
        .split(/\.\s|\s(?:te |le )?(?:yapeo|yapeare|pago|plin)\b/i)[0]
        .replace(/[.,;\s]+$/, "")
        .slice(0, 160);
    }
    const etiqueta = linea.match(/^\s*(?:direcci[oó]n|dir)\s*:?\s*(.+)$/i);
    if (etiqueta) return etiqueta[1].trim().slice(0, 160);
  }
  return "";
}

const RE_SIN_ENTRADA = /\b(sin entrada|sin sopa|solo segundo|solo el segundo|nada mas segundo|solo fondo|sin la entrada)\b/;
const RE_ENTRADA_GENERICA = /\b(entrada|sopa|con su entrada|con entrada|la de hoy)\b/;
const RE_NOTA = /\b(sin (cebolla|aji|sal|ajo|limon|crema|cremas|ensalada|papa|camote|yuca|culantro|perejil|picante|mayonesa|huevo|tomate)|poca sal|poco aji|bien cocid[oa]|bien frit[oa]|sin picante|con harto|con bastante|extra (de )?\w+|cremas aparte)\b/g;

export function leerPedidoLocal(texto, contexto) {
  const { segundos = [], entradas = [], extras = [] } = contexto || {};
  const { cuerpo, nombre, telefono } = limpiarWhatsApp(texto);
  const norm = normalizar(cuerpo);
  const dudas = [];

  // Pedazos: líneas, comas, "y", "+", "otro", "mas".
  const pedazos = norm
    .split(/\n|,|;|\+|\.\s|\by\b|\botro\b|\botra\b|\bmas\b|\btambien\b|\bademas\b/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);

  const menus = [];
  const entradasSueltas = []; // entradas que aparecen sin un segundo al lado
  const entradasExtraDirectas = []; // "un ceviche aparte"
  const adicionales = new Map();
  const sinEntradaGlobal = RE_SIN_ENTRADA.test(norm);

  const catalogo = contexto?.catalogo || [];
  const enMenu = new Set([...segundos, ...entradas, ...extras].map((x) => x.id));
  let ultimoMenu = null;
  const totalMenus = () => menus.reduce((a, m) => a + m.cantidad, 0);

  for (const pedazo of pedazos) {
    const tokens = palabras(pedazo);
    if (!tokens.length) continue;
    const todos = /\b(los dos|las dos|ambos|ambas|todos|todas|cada uno|cada una|c\/u|los tres|las tres)\b/.test(pedazo);
    const seg = mejorCoincidencia(tokens, segundos, 0.6);
    const ent = mejorCoincidencia(tokens, entradas, 0.6);
    const ext = mejorCoincidencia(tokens, extras, 0.7);
    const cant = cantidadEn(tokens);

    // ¿Nombra un plato que existe pero HOY no está? ("lomo saltado")
    const otro = catalogo.length ? mejorCoincidencia(tokens, catalogo, 0.75) : null;
    const mejorHoy = Math.max(seg?.p || 0, ent?.p || 0, ext?.p || 0);
    if (otro && !enMenu.has(otro.item.id) && otro.p > mejorHoy + 0.05) {
      dudas.push(`Pidió ${otro.item.nombre}, que hoy no está en el menú.`);
      continue;
    }

    if (seg) {
      if (seg.empate) dudas.push(`"${pedazo}" puede ser ${seg.item.nombre} o ${seg.empate.nombre}.`);
      const s = seg.item;
      let proteina = "";
      if (s.requiereProteina && s.proteinas?.length) {
        proteina = s.proteinas.length === 1 ? s.proteinas[0] : elegirProteina(tokens, s.proteinas);
      }
      const arroz = s.permiteArroz ? (/\bsin arroz\b/.test(pedazo) ? "sin" : "con") : null;
      ultimoMenu = {
        segundoId: s.id,
        proteina,
        entradaId: ent && !RE_SIN_ENTRADA.test(pedazo) ? ent.item.id : null,
        sinEntrada: RE_SIN_ENTRADA.test(pedazo),
        arroz,
        cantidad: cant || 1,
      };
      menus.push(ultimoMenu);
      continue;
    }

    // "otro con pollo a la plancha" después de "2 frejoles uno con chuleta":
    // es una de las unidades del plato anterior con otra proteína.
    if (ultimoMenu && !ent && !ext) {
      const s = segundos.find((x) => x.id === ultimoMenu.segundoId);
      const prot = s?.requiereProteina ? elegirProteina(tokens, s.proteinas || []) : "";
      if (prot) {
        if (!ultimoMenu.proteina) ultimoMenu.proteina = prot;
        else if (prot !== ultimoMenu.proteina) {
          const n = Math.min(cant || 1, Math.max(1, ultimoMenu.cantidad - 1));
          if (ultimoMenu.cantidad > n) {
            ultimoMenu.cantidad -= n;
            ultimoMenu = { ...ultimoMenu, proteina: prot, cantidad: n };
            menus.push(ultimoMenu);
          } else {
            ultimoMenu = { ...ultimoMenu, proteina: prot, cantidad: n };
            menus.push(ultimoMenu);
          }
        }
        continue;
      }
      if (s?.permiteArroz && /\bsin arroz\b/.test(pedazo)) {
        ultimoMenu.arroz = "sin";
        continue;
      }
    }

    if (ent && /\b(aparte|adicional|extra|de mas|demas)\b/.test(pedazo)) {
      entradasExtraDirectas.push({ id: ent.item.id, cantidad: cant || 1 });
      continue;
    }
    if (ent) {
      entradasSueltas.push({ id: ent.item.id, cantidad: todos ? Math.max(1, totalMenus()) : cant || 1 });
      continue;
    }
    if (ext) {
      adicionales.set(ext.item.id, (adicionales.get(ext.item.id) || 0) + (cant || 1));
      continue;
    }
    // "2 menus" sin decir cuál: si hay un solo segundo hoy, es ese.
    if (/\b(menu|menus|segundo|almuerzo|almuerzos|fondo)\b/.test(pedazo)) {
      if (segundos.length === 1) {
        ultimoMenu = { segundoId: segundos[0].id, proteina: "", entradaId: null, sinEntrada: false, arroz: segundos[0].permiteArroz ? "con" : null, cantidad: cant || 1 };
        menus.push(ultimoMenu);
      } else if (segundos.length > 1) {
        dudas.push(`Pidió ${cant && cant > 1 ? cant + " menús" : "un menú"} pero no dice de qué segundo.`);
      }
    }
  }

  // Proteína que vino en otro pedazo ("frejoles... con chuleta").
  for (const m of menus) {
    const s = segundos.find((x) => x.id === m.segundoId);
    if (s?.requiereProteina && !m.proteina && s.proteinas?.length) {
      const prot = elegirProteina(palabras(norm), s.proteinas);
      if (prot && menus.filter((x) => x.segundoId === m.segundoId).length === 1) m.proteina = prot;
      if (!m.proteina) dudas.push(`Falta la proteína de ${s.nombre} (${s.proteinas.join(" o ")}).`);
    }
  }

  // Entradas sueltas: primero acompañan a los menús que no tienen entrada (van
  // incluidas); las que sobran son entradas extra.
  const entradasExtra = new Map();
  for (const e of entradasExtraDirectas) entradasExtra.set(e.id, (entradasExtra.get(e.id) || 0) + e.cantidad);
  for (const e of entradasSueltas) {
    let quedan = e.cantidad;
    for (const m of menus) {
      if (quedan <= 0) break;
      if (m.entradaId || m.sinEntrada) continue;
      if (m.cantidad <= quedan) {
        m.entradaId = e.id;
        quedan -= m.cantidad;
      } else {
        // Menú x3 con 1 entrada: se separa en dos líneas.
        menus.push({ ...m, cantidad: m.cantidad - quedan, entradaId: null });
        m.cantidad = quedan;
        m.entradaId = e.id;
        quedan = 0;
      }
    }
    if (quedan > 0) entradasExtra.set(e.id, (entradasExtra.get(e.id) || 0) + quedan);
  }

  // "con entrada" / "con sopa" sin decir cuál: si hoy hay una sola, es esa.
  const sinEntradaAsignada = menus.filter((m) => !m.entradaId && !m.sinEntrada);
  if (sinEntradaAsignada.length && !sinEntradaGlobal) {
    if (entradas.length === 1) {
      sinEntradaAsignada.forEach((m) => (m.entradaId = entradas[0].id));
    } else if (entradas.length > 1 && RE_ENTRADA_GENERICA.test(norm)) {
      dudas.push(`Pidió entrada pero no dice cuál (${entradas.map((e) => e.nombre).join(" o ")}).`);
    }
  }

  if (!menus.length && !entradasExtra.size && !adicionales.size) {
    dudas.push("No reconocí ningún plato del menú de hoy en el mensaje.");
  }

  const modo = detectarModo(norm);
  const direccion = modo === "delivery" ? detectarDireccion(cuerpo) : "";
  if (modo === "delivery" && !direccion) dudas.push("Es delivery pero no encontré la dirección.");

  const notas = Array.from(new Set((norm.match(RE_NOTA) || []).map((n) => n.trim()))).join(", ");

  return {
    nombre,
    telefono,
    menus: menus.map(({ sinEntrada, ...m }) => ({ ...m, entradaId: sinEntrada ? null : m.entradaId })),
    entradasExtra: Array.from(entradasExtra, ([id, cantidad]) => ({ id, cantidad })),
    adicionales: Array.from(adicionales, ([id, cantidad]) => ({ id, cantidad })),
    modo,
    direccion,
    pago: detectarPago(norm),
    notas,
    dudas,
  };
}
