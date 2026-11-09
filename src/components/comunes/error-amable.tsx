/**
 * `<ErrorAmable>` (`components/comunes/error-amable.tsx`).
 *
 * Componente de error genérico para mostrar cuando algo falla (ej. un modelo
 * corrupto en `?m=`, ver docs/02-arquitectura.md §3.4: "si `?m=` falta o no
 * valida → `ErrorAmable` con botones 'Ir al editor' / 'Ir al inicio'").
 *
 * Mensaje siempre en español, sin vocabulario técnico (regla de oro #5 de
 * AGENTS.md: nada de "modelo inválido", "parseo", etc. para el usuario final).
 * La acción (botón o link) la decide quien use el componente: `accion` recibe
 * el elemento ya armado (ej. un `<Button render={<Link .../>}>`).
 */

import { CircleAlert } from "lucide-react";
import { cn } from "cn";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface ErrorAmableProps {
  /** Mensaje amable, en español y sin jerga técnica. */
  mensaje: string;
  /** Título corto. Por defecto, uno genérico. */
  titulo?: string;
  /** Botón(es) o link(s) de recuperación, ya armados por quien usa el componente. */
  accion?: React.ReactNode;
  className?: string;
}

export function ErrorAmable({
  mensaje,
  titulo = "Algo no salió como esperábamos",
  accion,
  className,
}: ErrorAmableProps) {
  return (
    <Alert variant="destructive" className={cn(className)}>
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{mensaje}</AlertDescription>
      {accion ? <AlertAction>{accion}</AlertAction> : null}
    </Alert>
  );
}
