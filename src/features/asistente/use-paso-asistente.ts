/**
 * Hook del paso actual del asistente (`features/asistente/use-paso-asistente.ts`).
 *
 * Envuelve `?paso=` (parser compartido de `lib/url-state.ts`, docs/02-arquitectura.md §3.1)
 * y lo acota siempre a un paso real (1 a 4 — el paso 5 "Revisar" es otra tarea, ver
 * AGENTS.md y el resumen de la tarea T5.1). Si la URL trae un valor fuera de rango (o
 * ausente), se normaliza a 1 sin que el asistente llegue a mostrar un paso inexistente.
 *
 * La regla "no se puede saltar a un paso posterior si el actual no es válido" (docs/06-ux-ui.md
 * §3.2) la aplica quien usa este hook (`<Asistente>`): acá solo se expone `irAPaso`, que
 * vuelve a acotar cualquier valor pedido al rango válido.
 */

"use client";

import { useQueryState } from "nuqs";

import { CLAVE_PASO, parseAsPaso } from "@/lib/url-state";

export const PASO_MINIMO = 1;
export const PASO_MAXIMO = 4;

export type NumeroPasoAsistente = 1 | 2 | 3 | 4;

function acotarPaso(valor: number): NumeroPasoAsistente {
  const entero = Number.isInteger(valor) ? valor : PASO_MINIMO;
  return Math.min(Math.max(entero, PASO_MINIMO), PASO_MAXIMO) as NumeroPasoAsistente;
}

export function usePasoAsistente(): {
  paso: NumeroPasoAsistente;
  irAPaso: (siguiente: number) => void;
} {
  const [pasoUrl, setPasoUrl] = useQueryState(CLAVE_PASO, parseAsPaso);
  const paso = acotarPaso(pasoUrl ?? PASO_MINIMO);

  function irAPaso(siguiente: number): void {
    void setPasoUrl(acotarPaso(siguiente));
  }

  return { paso, irAPaso };
}
