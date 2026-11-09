/**
 * `<Expresion>` (`components/comunes/expresion.tsx`) — docs/06-ux-ui.md §1.2.
 *
 * Renderiza un array de `TokenExpresion` (de `dominio/modelo/formato.ts`, ya
 * armado con las reglas de formato del dominio: signos, coeficientes
 * implícitos, fracción/decimal) como HTML:
 * - Variables (`tipo: "var"`) en itálica STIX, con el índice en `<sub>` real
 *   (ej. "x1" → "x" + <sub>1</sub>).
 * - Números (`tipo: "coef" | "num"`) y el resto de los tokens con
 *   `tabular-nums` para que alineen.
 *
 * Componente puro de presentación: no reimplementa el formato, solo consume
 * los tokens ya generados por el dominio (regla de oro #1 de AGENTS.md).
 */

import { Fragment } from "react";
import { cn } from "cn";

import type { TokenExpresion } from "@/dominio/modelo/formato";

export interface ExpresionProps {
  tokens: TokenExpresion[];
  className?: string;
}

/** Separa el nombre de una variable en su parte literal y su índice: "x1" → ("x", "1"). */
const PATRON_VARIABLE = /^([A-Za-z]+)(\d+)$/;

export function Expresion({ tokens, className }: ExpresionProps) {
  return (
    <span className={cn("font-serif tabular-nums", className)}>
      {tokens.map((token, indice) => (
        <Fragment key={indice}>{renderToken(token)}</Fragment>
      ))}
    </span>
  );
}

function renderToken(token: TokenExpresion) {
  if (token.tipo === "var") {
    const coincidencia = PATRON_VARIABLE.exec(token.texto);
    if (coincidencia === null) {
      return <span className="italic">{token.texto}</span>;
    }
    const [, base, indice] = coincidencia;
    return (
      <span className="italic">
        {base}
        <sub>{indice}</sub>
      </span>
    );
  }

  return <span>{token.texto}</span>;
}
