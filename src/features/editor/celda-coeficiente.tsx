/**
 * `<CeldaCoeficiente>` (`features/editor/celda-coeficiente.tsx`) — una celda numérica de la
 * grilla del editor (docs/06-ux-ui.md §3.3), reusada tanto en la fila `Z` como en cada
 * restricción.
 *
 * - `aria-label` descriptivo por celda (ej. "Coeficiente de x2 en R1"), como pide el mockup.
 * - Responsive sin duplicar markup: el wrapper es `flex flex-col` (tarjeta apilada) en móvil
 *   y `contents` en escritorio (`md:contents`), así el `<Input>` pasa a ser directamente el
 *   ítem de la grilla CSS compartida por toda la fila (ver `editor.tsx`). La mini-etiqueta y
 *   el error inline solo se muestran en móvil (`md:hidden`): en la grilla de escritorio el
 *   error se señala con `aria-invalid` y se lista en el resumen de errores al enviar (hay
 *   espacio de sobra para texto en una tarjeta, no en una celda angosta) — decisión de bajo
 *   riesgo, documentada en el resumen de la tarea.
 */

"use client";

import type { KeyboardEvent } from "react";

import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export interface CeldaCoeficienteProps {
  id: string;
  valor: string;
  error?: string;
  etiquetaAria: string;
  /** Mini-etiqueta visible solo en la tarjeta móvil (ej. "Aporte de x2"). */
  etiquetaMovil: string;
  onChange: (valor: string) => void;
  onBlur: () => void;
  onKeyDown: (evento: KeyboardEvent<HTMLInputElement>) => void;
}

export function CeldaCoeficiente({
  id,
  valor,
  error,
  etiquetaAria,
  etiquetaMovil,
  onChange,
  onBlur,
  onKeyDown,
}: CeldaCoeficienteProps) {
  return (
    <div className="flex flex-col gap-1 md:contents">
      <span className="text-xs text-muted-foreground md:hidden">{etiquetaMovil}</span>
      <Input
        id={id}
        value={valor}
        aria-label={etiquetaAria}
        aria-invalid={error !== undefined}
        aria-describedby={error !== undefined ? `${id}-error` : undefined}
        onChange={(evento) => onChange(evento.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="text-right tabular-nums"
        autoComplete="off"
      />
      <FieldError
        id={`${id}-error`}
        errors={error !== undefined ? [{ message: error }] : undefined}
        className="md:hidden"
      />
    </div>
  );
}
