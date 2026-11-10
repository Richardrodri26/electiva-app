/**
 * Stepper de iteraciones de la pestaña Simplex (`features/resultados/vista-simplex/stepper.tsx`),
 * docs/06-ux-ui.md §3.4: "Iteraciones: (0)───(1)───(2✓) [‹ Anterior] [Siguiente ›]".
 *
 * Controlado por `?iter=` (el padre, `index.tsx`, es quien lee/escribe la URL con nuqs —
 * este componente solo recibe `iter`/`total` y notifica el cambio). Las flechas de teclado
 * se manejan en `index.tsx` (en el contenedor que envuelve stepper + tabla + explicación,
 * docs/06 §3.4: "cuando el foco está en el área de la tabla"), no acá.
 */

"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

export interface StepperProps {
  /** 0-based: índice de la tabla actual dentro de 0..total-1. */
  iter: number;
  total: number;
  onCambiarIter: (siguiente: number) => void;
  /** El último punto (la tabla final) llega a un estado resuelto (ej. óptimo): se marca con ✓. */
  finalResuelto?: boolean;
}

export function Stepper({ iter, total, onCambiarIter, finalResuelto = false }: StepperProps) {
  const irA = (n: number) => {
    if (n < 0 || n >= total) return;
    onCambiarIter(n);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Iteraciones del Simplex" className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: total }, (_, n) => {
          const esActual = n === iter;
          const esUltimaYResuelta = finalResuelto && n === total - 1;
          return (
            <button
              key={n}
              type="button"
              aria-current={esActual ? "step" : undefined}
              onClick={() => irA(n)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                esActual
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {esUltimaYResuelta ? <Check aria-hidden="true" className="size-4" /> : n}
              <span className="sr-only">
                {esActual ? "tabla actual" : "ir a esta tabla"}
                {esUltimaYResuelta ? ", resuelta" : ""}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={iter === 0} onClick={() => irA(iter - 1)}>
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={iter === total - 1} onClick={() => irA(iter + 1)}>
          Siguiente
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
