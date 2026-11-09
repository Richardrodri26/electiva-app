/**
 * `<EstadoVacio>` (`components/comunes/estado-vacio.tsx`).
 *
 * Estado vacío genérico (ej. "Estado vacío del historial: no se muestra la
 * sección" en docs/06-ux-ui.md §3.1 es un caso donde ni esto se muestra, pero
 * otras pantallas sí necesitan decir "todavía no hay nada que mostrar").
 * Texto siempre en español, sin jerga técnica (regla de oro #5 de AGENTS.md).
 */

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "cn";

export interface EstadoVacioProps {
  /** Título corto, ej: "Todavía no hay nada que mostrar". */
  titulo: string;
  /** Texto adicional, opcional. */
  descripcion?: string;
  /** Ícono de `lucide-react`. Por defecto, uno genérico de "vacío". */
  icono?: LucideIcon;
  /** Botón o link opcional, ej: "Empezar con preguntas". */
  accion?: React.ReactNode;
  className?: string;
}

export function EstadoVacio({
  titulo,
  descripcion,
  icono: Icono = Inbox,
  accion,
  className,
}: EstadoVacioProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center text-muted-foreground",
        className,
      )}
    >
      <Icono aria-hidden="true" className="size-8" />
      <p className="text-base font-semibold text-foreground">{titulo}</p>
      {descripcion ? <p className="max-w-[60ch] text-sm">{descripcion}</p> : null}
      {accion ? <div className="mt-2">{accion}</div> : null}
    </div>
  );
}
