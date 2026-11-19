// src/lib/mamaGuia.js
// Mamá viva en la página del cliente:
//  1. Intro: a los 1.4 s sale vapor del letrero; a los 2.6 s Mamá sube
//     asomándose por detrás del letrero, da un saltito y se queda
//     "respirando" (y salta cada tanto).
//  2. Al bajar: UNA Mamá chiquita va saltando en arco de parada en parada.
//     Las paradas son elementos con data-mama:
//       "arriba" → se para encima, en la esquina derecha del elemento
//       "texto"  → se para a la derecha del texto (títulos)
//       "asoma"  → mientras se ve esa sección, se asoma desde el borde
//                  derecho de la pantalla, mirando (Elige tu plato)
//       "final"  → última parada; ahí se queda (Encuéntranos)
//  3. Al tocar un botón, salta encima y vuelve. Al agregar un plato
//     (evento "mama:lleva"), lo agarra y lo deja en la bolsa del pedido.
// Con "reducir movimiento" activado, Mamá se queda quieta en la portada.
// Hecho con Web Animations + requestAnimationFrame, sin librerías.

const RATIO = 900 / 557; // alto / ancho de la imagen
const SRC = "/mama/mama-saluda-chica.webp";
const SALTO = [
  { transform: "translateY(0)" },
  { transform: "translateY(-22%) rotate(-4deg)", offset: 0.45 },
  { transform: "translateY(0) scale(1.08,.9)", offset: 0.8 },
  { transform: "translateY(0)" },
];

export function iniciarMamaGuia(raiz) {
  const spot = document.getElementById("mama-spot");
  const mover = document.getElementById("mama-move");
  const heroImg = document.getElementById("mama-hero");
  if (!spot || !mover || !heroImg) return () => {};

  const reduce =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && !document.documentElement.classList.contains("forzar-movimiento");
  const timers = [];
  let listo = false;
  let idle = null;
  let saltos = 0;
  let geo = null;
  let raf = 0;
  let modo = "hero";
  let ocupado = false;
  let vivo = true;

  // ---------- 1. Intro ----------
  const idleOn = () => {
    if (reduce) return;
    idle = heroImg.animate([{ transform: "scale(1,1)" }, { transform: "scale(1.02,.975)" }], {
      duration: 900,
      iterations: Infinity,
      direction: "alternate",
      easing: "ease-in-out",
    });
    saltos = setInterval(() => {
      if (modo === "hero" && !ocupado) mover.animate(SALTO, { duration: 520, easing: "ease-out" });
    }, 6500);
  };

  const entrar = () => {
    if (!vivo) return;
    if (reduce) {
      heroImg.style.transform = "none";
      spot.classList.add("fuera");
      listo = true;
      return;
    }
    const subida = heroImg.animate(
      [
        { transform: "translateY(105%)", easing: "ease-out" },
        { transform: "translateY(58%) rotate(-4deg)", offset: 0.32 },
        { transform: "translateY(56%) rotate(4deg)", offset: 0.52, easing: "cubic-bezier(.3,1.4,.5,1)" },
        { transform: "translateY(-8%) scale(.96,1.06)", offset: 0.82 },
        { transform: "translateY(0) scale(1,1)" },
      ],
      { duration: 1150, fill: "forwards" }
    );
    subida.onfinish = () => {
      spot.classList.add("fuera");
      heroImg.style.transform = "none";
      subida.cancel();
      mover.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-30%) rotate(-6deg)", offset: 0.45 },
          { transform: "translateY(0) scale(1.1,.88)", offset: 0.8 },
          { transform: "translateY(0)" },
        ],
        { duration: 560, easing: "ease-out" }
      ).onfinish = () => {
        listo = true;
        idleOn();
        geo = null;
        cuadro();
      };
    };
  };
  timers.push(setTimeout(entrar, reduce ? 0 : 2600));

  // Vapor cuando el letrero golpea la pared.
  if (!reduce) {
    timers.push(
      setTimeout(() => {
        const caja = document.getElementById("letrero-caja");
        if (!caja) return;
        for (let i = 0; i < 12; i++) {
          const v = document.createElement("span");
          v.className = "vapor";
          const x = 6 + Math.random() * 88;
          const t = 10 + Math.random() * 18;
          v.style.left = `${x}%`;
          v.style.bottom = "6%";
          v.style.width = v.style.height = `${t}px`;
          caja.appendChild(v);
          const dx = (x - 50) * 1.5 + (Math.random() * 40 - 20);
          const dy = -(14 + Math.random() * 60);
          v.animate(
            [
              { opacity: 0.95, transform: "translate(0,0) scale(.6)" },
              { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(1.9)` },
            ],
            { duration: 750 + Math.random() * 450, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
          ).onfinish = () => v.remove();
        }
      }, 1400)
    );
  }

  // En computadora, Mamá voltea un poquito hacia el mouse.
  const portada = document.getElementById("portada");
  let miraRaf = 0;
  const alMover = (e) => {
    if (miraRaf) return;
    miraRaf = requestAnimationFrame(() => {
      miraRaf = 0;
      const r = spot.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
      spot.style.setProperty("--mira", `${Math.max(-8, Math.min(8, dx * 16)).toFixed(1)}deg`);
    });
  };
  const alSalir = () => spot.style.setProperty("--mira", "0deg");
  const conMouse = window.matchMedia?.("(hover: hover)").matches;
  if (conMouse && portada) {
    portada.addEventListener("pointermove", alMover);
    portada.addEventListener("pointerleave", alSalir);
  }

  // ---------- 2. Mamá que acompaña al bajar ----------
  const guia = document.createElement("div");
  guia.className = "mama-vuela mama-escondible";
  guia.setAttribute("aria-hidden", "true");
  guia.innerHTML = `<img src="${SRC}" alt="">`;
  guia.style.opacity = "0";
  document.body.appendChild(guia);

  const suave = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const rectTexto = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const b = r.getBoundingClientRect();
    return b.width ? b : el.getBoundingClientRect();
  };
  const anchoGuia = () => (innerWidth < 700 ? 56 : 72);

  const paradas = () => {
    const y = scrollY;
    const vh = innerHeight;
    const mob = innerWidth < 700;
    const w = anchoGuia();
    const h = w * RATIO;
    const lista = [];
    const r = spot.getBoundingClientRect();
    lista.push({ x: r.left + (r.width - w) / 2, y: r.bottom + y - h, arrive: 0, leave: 2 });
    const limitarX = (x) => Math.max(2, Math.min(innerWidth - w - 2, x));

    raiz.querySelectorAll("[data-mama]").forEach((el) => {
      if (!el.offsetParent) return;
      const tipo = el.dataset.mama;
      if (tipo === "asoma") {
        const s = el.getBoundingClientRect();
        lista.push({
          asoma: true,
          x: innerWidth - w * (mob ? 0.16 : 0.22),
          sy: vh * (mob ? 0.5 : 0.46) - h,
          rot: -38,
          arrive: s.top + y - vh * 0.55,
          leave: s.bottom + y - vh * 0.45,
        });
        return;
      }
      const b = tipo === "texto" ? rectTexto(el) : el.getBoundingClientRect();
      if (!b.width) return;
      const top = b.top + y;
      if (tipo === "final") {
        const wf = mob ? 84 : 104;
        lista.push({ x: Math.min(innerWidth - wf - 4, b.right - wf - 6), y: top - wf * RATIO + 8, arrive: top - vh * 0.5, leave: Infinity, w: wf, final: true });
        return;
      }
      const x = tipo === "texto" ? limitarX(b.right + 8) : limitarX(b.right - w * 0.92);
      const yy = tipo === "texto" ? b.bottom + y - h + 2 : top - h + 5;
      lista.push({ x, y: yy, arrive: top - vh * 0.66, leave: top - vh * 0.3 });
    });

    // Cada salto recibe espacio de scroll según lo lejos que va; una parada
    // que no entra antes del final de la página se quita en vez de apretarla.
    const maxS = document.documentElement.scrollHeight - vh;
    const orig = lista.map((o) => ({ a: o.arrive, l: o.leave }));
    const brecha = (p, q) => {
      const dx = Math.abs(q.x - p.x);
      const dy = p.asoma || q.asoma ? vh * 0.3 : Math.abs(q.y - p.y);
      return Math.max(Math.min(160, vh * 0.18), Math.min(420, Math.hypot(dx, dy) * 0.45));
    };
    const ordenar = () => {
      for (let i = 1; i < lista.length; i++) {
        lista[i].arrive = Math.max(orig[i].a, lista[i - 1].leave + brecha(lista[i - 1], lista[i]));
        if (lista[i].leave !== Infinity) lista[i].leave = Math.max(orig[i].l, lista[i].arrive + (lista[i].asoma ? 60 : 40));
      }
    };
    ordenar();
    while (lista.length > 2 && lista[lista.length - 1].arrive > maxS - 4) {
      const k = lista.length - 2;
      if (lista[k].asoma || k === 0) break;
      lista.splice(k, 1);
      orig.splice(k, 1);
      ordenar();
    }
    const n = lista.length - 1;
    if (n > 0 && lista[n].arrive > maxS - 4) {
      lista[n].arrive = Math.max(4, maxS - 4);
      for (let j = n - 1; j >= 1; j--) {
        const g = brecha(lista[j], lista[j + 1]);
        if (lista[j].leave > lista[j + 1].arrive - g) lista[j].leave = lista[j + 1].arrive - g;
        if (lista[j].arrive > lista[j].leave - 30) lista[j].arrive = lista[j].leave - 30;
      }
    }
    geo = { w, lista };
  };

  const ponerModo = (m) => {
    if (m === modo) return;
    modo = m;
    mover.style.opacity = m === "hero" ? "1" : "0";
    guia.style.opacity = m === "guia" ? "1" : "0";
  };

  const cuadro = () => {
    raf = 0;
    if (!listo || !vivo) return;
    if (reduce) return;
    if (!geo) paradas();
    const L = geo.lista;
    const s = scrollY;
    let w = geo.w;
    let x;
    let yy;
    let rot = 0;
    let sq = "scale(1,1)";
    if (s <= 2 || L.length < 2) {
      ponerModo("hero");
      return;
    }
    ponerModo("guia");
    let asomando = false;
    const ultima = L[L.length - 1];
    if (s >= ultima.arrive) {
      x = ultima.x;
      yy = ultima.y - s;
      if (ultima.w) w = ultima.w;
    } else {
      for (let i = 0; i < L.length - 1; i++) {
        const a = L[i];
        const b = L[i + 1];
        if (s < a.leave) {
          if (a.asoma) {
            x = a.x;
            yy = a.sy;
            rot = a.rot;
            asomando = true;
            break;
          }
          x = a.x;
          yy = a.y - s - Math.abs(Math.sin(((s - a.arrive) / 140) * Math.PI)) * 4;
          break;
        }
        if (s < b.arrive) {
          const p = (s - a.leave) / (b.arrive - a.leave);
          const e = suave(p);
          const ay = a.asoma ? a.leave + a.sy : a.y;
          const by = b.asoma ? b.arrive + b.sy : b.y;
          x = a.x + (b.x - a.x) * e;
          yy = ay + (by - ay) * e - s;
          const dist = Math.hypot(b.x - a.x, by - ay);
          yy -= Math.sin(p * Math.PI) * Math.min(130, 40 + dist * 0.25);
          rot = Math.sin(p * Math.PI * 2) * 9 * (b.x >= a.x ? 1 : -1) + (a.rot || 0) * (1 - e) + (b.rot || 0) * e;
          sq = (p < 0.08 && !a.asoma) || (p > 0.92 && !b.asoma) ? "scale(1.12,.86)" : "scale(1,1)";
          if (b.w) w = geo.w + (b.w - geo.w) * e;
          break;
        }
      }
    }
    if (x === undefined || !isFinite(x) || !isFinite(yy)) {
      x = L[0].x;
      yy = L[0].y - s;
      rot = 0;
    }
    guia.classList.toggle("asomada", asomando);
    guia.classList.toggle("quieta", s >= ultima.arrive);
    guia.style.width = `${w.toFixed(1)}px`;
    guia.style.transform = `translate3d(${x.toFixed(1)}px,${yy.toFixed(1)}px,0) rotate(${rot.toFixed(1)}deg) ${sq}`;
  };

  const pedirCuadro = () => {
    if (!raf) raf = requestAnimationFrame(cuadro);
  };
  const rehacer = () => {
    geo = null;
    pedirCuadro();
  };
  addEventListener("scroll", pedirCuadro, { passive: true });
  addEventListener("resize", rehacer);
  addEventListener("orientationchange", rehacer);
  document.fonts?.ready.then(rehacer);
  const ro = "ResizeObserver" in window ? new ResizeObserver(rehacer) : null;
  ro?.observe(document.body);

  // ---------- 3. Saltos a botones y llevar el plato ----------
  const fuente = () => {
    if (modo === "hero") return heroImg.getBoundingClientRect();
    return guia.getBoundingClientRect();
  };
  const volar = (cuadros, duracion, conPlato) => {
    const W = innerWidth < 700 ? 56 : 72;
    const f = document.createElement("div");
    f.className = "mama-vuela";
    f.style.width = `${W}px`;
    f.innerHTML = `<img src="${SRC}" alt="">${conPlato ? '<span class="plato"></span>' : ""}`;
    if (conPlato) f.querySelector(".plato").textContent = conPlato;
    document.body.appendChild(f);
    document.documentElement.classList.add("mama-volando");
    ocupado = true;
    const anim = f.animate(cuadros, { duration: duracion, easing: "linear", fill: "forwards" });
    anim.onfinish = () => {
      f.remove();
      document.documentElement.classList.remove("mama-volando");
      ocupado = false;
    };
    return f;
  };
  const tramo = (k, a, b, o0, o1, alto, n = 8) => {
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      const x = a.x + (b.x - a.x) * p;
      const y = a.y + (b.y - a.y) * p - Math.sin(p * Math.PI) * alto;
      const r = Math.sin(p * Math.PI * 2) * 10 * (b.x >= a.x ? 1 : -1);
      k.push({ transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${r.toFixed(1)}deg)`, offset: +(o0 + (o1 - o0) * p).toFixed(4) });
    }
  };
  const altura = (a, b) => Math.min(160, Math.max(60, Math.abs(a.y - b.y) * 0.35 + 40));

  const saltarA = (btn) => {
    if (reduce || ocupado || !listo) return;
    const r = btn.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    const s0 = fuente();
    if (!s0.width) return;
    const W = innerWidth < 700 ? 56 : 72;
    const H = W * RATIO;
    const mx = innerWidth - W - 4;
    const A = { x: Math.max(4, Math.min(mx, s0.left + (s0.width - W) / 2)), y: s0.bottom - H };
    const B = { x: Math.max(4, Math.min(mx, r.left + r.width / 2 - W / 2)), y: Math.max(4, r.top - H * 0.8) };
    const k = [];
    tramo(k, A, B, 0, 0.4, altura(A, B));
    const pb = `translate3d(${B.x.toFixed(1)}px,${B.y.toFixed(1)}px,0)`;
    k.push({ transform: `${pb} scale(1.15,.84)`, offset: 0.46 });
    k.push({ transform: `${pb} translateY(-14%)`, offset: 0.53 });
    k.push({ transform: pb, offset: 0.6 });
    tramo(k, B, A, 0.6, 1, altura(A, B));
    volar(k, 900);
  };

  const llevar = (desde, nombre) => {
    const bolsa = document.getElementById("bolsa-pedido");
    if (reduce || ocupado || !listo || !bolsa || !desde?.width) return;
    const W = innerWidth < 700 ? 56 : 72;
    const H = W * RATIO;
    const mx = innerWidth - W - 4;
    const enGuia = modo === "guia";
    const s0 = enGuia ? guia.getBoundingClientRect() : null;
    const A = s0 ? { x: Math.min(innerWidth - W * 0.5, s0.left + s0.width / 2 - W / 2), y: s0.top + s0.height / 2 - H / 2 } : { x: innerWidth + 8, y: Math.max(8, desde.top - H) };
    const B = { x: Math.max(4, Math.min(mx, desde.left + desde.width / 2 - W / 2)), y: Math.max(4, desde.top - H * 0.82) };
    const t = bolsa.getBoundingClientRect();
    const T = { x: Math.max(4, Math.min(mx, t.left + t.width / 2 - W / 2)), y: t.top - H * 0.72 };
    const k = [];
    const apretar = (p, o) => k.push({ transform: `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(1.14,.84)`, offset: o });
    tramo(k, A, B, 0, 0.27, altura(A, B));
    apretar(B, 0.31);
    k.push({ transform: `translate3d(${B.x.toFixed(1)}px,${B.y.toFixed(1)}px,0)`, offset: 0.34 });
    tramo(k, B, T, 0.34, 0.66, altura(B, T), 9);
    apretar(T, 0.7);
    if (enGuia) {
      k.push({ transform: `translate3d(${T.x.toFixed(1)}px,${T.y.toFixed(1)}px,0)`, offset: 0.73 });
      tramo(k, T, A, 0.73, 1, altura(T, A));
    } else {
      k.push({ transform: `translate3d(${(T.x + W * 0.4).toFixed(1)}px,${(T.y + H * 0.3).toFixed(1)}px,0) scale(.2)`, offset: 1 });
    }
    const dur = enGuia ? 1080 : 820;
    const f = volar(k, dur, nombre.length > 22 ? `${nombre.slice(0, 21)}…` : nombre);
    f.querySelector(".plato").animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.29 },
        { opacity: 1, offset: 0.32 },
        { opacity: 1, offset: 0.67 },
        { opacity: 0, offset: 0.7 },
        { opacity: 0, offset: 1 },
      ],
      { duration: dur, fill: "forwards" }
    );
  };

  const alTocar = (e) => {
    const t = e.target.closest("a,button,summary,label");
    if (!t || t.closest("[data-mama-lleva]")) return;
    saltarA(t);
  };
  const alLlevar = (e) => llevar(e.detail?.rect, e.detail?.nombre || "");
  raiz.addEventListener("click", alTocar, true);
  addEventListener("mama:lleva", alLlevar);

  return () => {
    vivo = false;
    timers.forEach(clearTimeout);
    clearInterval(saltos);
    idle?.cancel();
    if (raf) cancelAnimationFrame(raf);
    removeEventListener("scroll", pedirCuadro);
    removeEventListener("resize", rehacer);
    removeEventListener("orientationchange", rehacer);
    removeEventListener("mama:lleva", alLlevar);
    raiz.removeEventListener("click", alTocar, true);
    portada?.removeEventListener("pointermove", alMover);
    portada?.removeEventListener("pointerleave", alSalir);
    ro?.disconnect();
    guia.remove();
    document.documentElement.classList.remove("mama-volando");
  };
}

// Para avisar desde un botón "Agregar": Mamá lleva ese plato a la bolsa.
export function mamaLleva(boton, nombre) {
  if (!boton) return;
  window.dispatchEvent(new CustomEvent("mama:lleva", { detail: { rect: boton.getBoundingClientRect(), nombre } }));
}
