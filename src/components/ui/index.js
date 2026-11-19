// src/components/ui/index.js
// Barrel file: permite importar así en otros archivos:
//   import { Tag, Field, Row, EmptyState, QtyCard, SelectCard } from "../components/ui";
// en vez de una línea de import por cada componente.

export { Tag } from "./Tag";
export { Field } from "./Field";
export { Row } from "./Row";
export { EmptyState } from "./EmptyState";
export { QtyCard } from "./QtyCard";
export { SelectCard } from "./SelectCard";
export { ConfirmDialog } from "./ConfirmDialog";
export { Avisos } from "./Toast";
export { avisar } from "./avisar";
export { vibrar } from "./vibrar";
export { Skeleton } from "./Skeleton";
export { inputStyle } from "./inputStyle";
export { FotoPlato } from "./FotoPlato";
// Sheet (vaul) no va aquí: se importa directo de "./Sheet" para que no entre
// al código que descarga el cliente.
export { Switch } from "./Switch";
