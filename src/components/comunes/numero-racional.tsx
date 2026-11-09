/**
 * `<NumeroRacional>` (`components/comunes/numero-racional.tsx`) — docs/06-ux-ui.md §1.2.
 *
 * Muestra una `Fraccion` del dominio en alguno de tres modos:
 * - `"apilada"`: numerador sobre denominador (tamaño 0,8 em), para tablas.
 * - `"linea"`: fracción en línea (ej. "31/4"), para texto corrido.
 * - `"decimal"`: representación decimal (`Fraccion.aDecimal()`).
 *
 * Componente puro: el modo llega por prop. En el uso real ese modo proviene
 * de `?num=` (ver `src/lib/url-state.ts`), pero este componente no lee la URL
 * (igual que pide la tarea: "recibir el modo por prop, no leer la URL él mismo").
 *
 * Cuando la fracción es entera (`esEntera()`) no hay nada que apilar ni poner
 * en línea como fracción: se muestra el entero (`aTexto()`) en los tres modos
 * salvo `"decimal"`, que siempre usa `aDecimal()`.
 */

import { cn } from "cn";

import type { Fraccion } from "@/dominio/aritmetica/fraccion";

export type ModoNumeroRacional = "apilada" | "linea" | "decimal";

export interface NumeroRacionalProps {
  valor: Fraccion;
  modo: ModoNumeroRacional;
  className?: string;
}

/** Signo menos tipográfico (U+2212), igual al usado en `dominio/modelo/formato.ts` para la UI. */
const MENOS_UI = "−";

export function NumeroRacional({ valor, modo, className }: NumeroRacionalProps) {
  if (modo === "decimal") {
    return (
      <span className={cn("font-serif tabular-nums", className)}>{valor.aDecimal()}</span>
    );
  }

  if (valor.esEntera()) {
    return <span className={cn("font-serif tabular-nums", className)}>{valor.aTexto()}</span>;
  }

  const negativo = valor.esNegativa();
  const absoluto = valor.abs();
  const numerador = absoluto.num.toString();
  const denominador = absoluto.den.toString();
  const etiqueta = valor.aTexto();

  if (modo === "linea") {
    return (
      <span className={cn("font-serif tabular-nums", className)} aria-label={etiqueta}>
        <span aria-hidden="true">
          {negativo ? MENOS_UI : ""}
          {numerador}/{denominador}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-baseline gap-0.5 font-serif tabular-nums", className)}
      aria-label={etiqueta}
    >
      {negativo ? <span aria-hidden="true">{MENOS_UI}</span> : null}
      <span aria-hidden="true" className="inline-flex flex-col items-center text-[0.8em] leading-tight">
        <span className="border-b border-current px-0.5">{numerador}</span>
        <span className="px-0.5">{denominador}</span>
      </span>
    </span>
  );
}
