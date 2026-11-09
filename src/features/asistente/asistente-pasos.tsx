/**
 * `<AsistentePasos>` (`features/asistente/asistente-pasos.tsx`) — el stepper del
 * mockup de docs/06-ux-ui.md §3.2: "1 Qué decides ─ 2 Qué quieres lograr ─ 3 Limitaciones
 * ─ 4 Cantidades ─ 5 Revisar". Es una secuencia real (docs/06: "el stepper sí es una
 * secuencia: numerar está justificado"), por eso se numera.
 *
 * El paso 5 ("Revisar", T5.2) se habilita igual que los demás: solo se puede volver a un
 * paso ya completado o quedarse en el actual — nunca adelantarse a uno que todavía no se
 * validó (docs/06 §3.2) — `pasoMaximoAlcanzado` controla eso para los 5 pasos por igual.
 */

"use client";

import { cn } from "cn";

import { TITULOS_PASOS } from "./textos";

export interface AsistentePasosProps {
  pasoActual: 1 | 2 | 3 | 4 | 5;
  /** El paso más lejano ya validado (hasta acá se puede volver con el stepper). */
  pasoMaximoAlcanzado: 1 | 2 | 3 | 4 | 5;
  onIrAPaso: (paso: 1 | 2 | 3 | 4 | 5) => void;
  className?: string;
}

export function AsistentePasos({ pasoActual, pasoMaximoAlcanzado, onIrAPaso, className }: AsistentePasosProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm", className)} aria-label="Pasos del asistente">
      {TITULOS_PASOS.map((titulo, indice) => {
        const numero = (indice + 1) as 1 | 2 | 3 | 4 | 5;
        const esUltimo = indice === TITULOS_PASOS.length - 1;
        const alcanzable = numero <= pasoMaximoAlcanzado;
        const esActual = numero === pasoActual;
        return (
          <li key={numero} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!alcanzable}
              aria-current={esActual ? "step" : undefined}
              onClick={() => onIrAPaso(numero)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium transition-colors",
                esActual ? "bg-primary/10 text-primary" : "text-muted-foreground",
                alcanzable && !esActual ? "hover:bg-muted hover:text-foreground" : "",
                !alcanzable ? "cursor-not-allowed opacity-50" : "",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  esActual ? "border-primary bg-primary text-primary-foreground" : "border-current",
                )}
                aria-hidden="true"
              >
                {numero}
              </span>
              {titulo}
            </button>
            {!esUltimo ? (
              <span aria-hidden="true" className="text-muted-foreground">
                ─
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
