// Muestra un aviso breve (ver <Avisos /> en Toast.jsx).
// variant: "error" (por defecto), "success" o "info".
import { toast } from "sonner";

export function avisar(mensaje, variant = "error") {
  if (variant === "success") return toast.success(mensaje);
  if (variant === "info") return toast.info(mensaje);
  return toast.error(mensaje);
}
