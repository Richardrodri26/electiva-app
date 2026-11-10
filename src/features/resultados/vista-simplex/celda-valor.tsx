/**
 * Celdas numéricas de la tabla Simplex (`features/resultados/vista-simplex/celda-valor.tsx`).
 *
 * `<CeldaFraccion>` reusa `<NumeroRacional>` (apilada en modo fracción, docs/06-ux-ui.md §1.2);
 * `<CeldaValorM>` es el equivalente para la fila Z, que puede llevar M (docs/04-motor-simplex.md
 * §1): si no lleva M, delega en `<CeldaFraccion>`; si lleva M, se muestra en línea con
 * `formatearValorM` (no hay versión "apilada" razonable para `"2 - 3M"`).
 */

import { cn } from "cn";

import { NumeroRacional } from "@/components/comunes/numero-racional";
import { Fraccion } from "@/dominio/aritmetica/fraccion";
import type { ValorM } from "@/dominio/aritmetica/valor-m";
import type { FormatoNumero } from "@/dominio/modelo/formato";

import { formatearValorM } from "./formato-valor-m";

export interface CeldaFraccionProps {
  valor: Fraccion;
  formato: FormatoNumero;
  className?: string;
}

export function CeldaFraccion({ valor, formato, className }: CeldaFraccionProps) {
  const modo = formato === "fraccion" ? "apilada" : "decimal";
  return <NumeroRacional valor={valor} modo={modo} className={cn("justify-end", className)} />;
}

export interface CeldaValorMProps {
  valor: ValorM;
  formato: FormatoNumero;
  className?: string;
}

export function CeldaValorM({ valor, formato, className }: CeldaValorMProps) {
  if (valor.b.esCero()) {
    return <CeldaFraccion valor={valor.a} formato={formato} className={className} />;
  }
  return (
    <span
      className={cn("inline-block w-full text-right font-serif tabular-nums", className)}
      aria-label={valor.aTexto()}
    >
      {formatearValorM(valor, formato)}
    </span>
  );
}

export interface CeldaMixtaProps {
  /** Las filas de restricción nunca llevan M (`Fraccion`); la fila Z sí puede (`ValorM`). */
  valor: Fraccion | ValorM;
  formato: FormatoNumero;
  className?: string;
}

/** Elige `<CeldaFraccion>` o `<CeldaValorM>` según el tipo real de `valor` en tiempo de ejecución. */
export function CeldaMixta({ valor, formato, className }: CeldaMixtaProps) {
  if (valor instanceof Fraccion) {
    return <CeldaFraccion valor={valor} formato={formato} className={className} />;
  }
  return <CeldaValorM valor={valor} formato={formato} className={className} />;
}
