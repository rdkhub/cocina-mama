// Vibración muy corta al tocar algo importante (solo Android; en iPhone y
// computadoras no hace nada). Le da a la app la sensación de botón real.
export function vibrar(ms = 8) {
  try {
    if (navigator.vibrate && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) navigator.vibrate(ms);
  } catch {
    /* sin vibración */
  }
}
