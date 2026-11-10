/**
 * Tokens de una ecuación a partir de `Fraccion[]` ya calculadas (no `NumeroTexto`), para los
 * pasos de preparación (`features/resultados/vista-simplex/tokens-fraccion.ts`).
 *
 * `dominio/modelo/formato.ts` expone `generarTokensExpresion`/`generarTokensRestriccion`,
 * pero reciben `NumeroTexto[]` (texto sin parsear) y `Variable[]` del modelo — no sirven para
 * los pasos de `PasoPreparacion.normalizar_limite`, que ya traen `Fraccion[]` calculadas y,
 * en el caso general de la preparación, nombres de columna que no son `Variable[]` (S, A).
 * Mismas reglas de formato (coeficiente 0 se omite, 1 implícito, signo tipográfico U+2212),
 * para que se vea igual que el resto de la app (docs/06-ux-ui.md §1.2).
 */

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import { formatearValorNumerico, type FormatoNumero, type TokenExpresion } from "@/dominio/modelo/formato";
import type { Relacion } from "@/dominio/modelo/tipos";

const MENOS_UI = "−";

/** Tokens de una expresión (suma de términos), omitiendo los términos en 0. */
export function tokensExpresionFraccion(
  coeficientes: readonly Fraccion[],
  nombres: readonly string[],
  formato: FormatoNumero,
): TokenExpresion[] {
  const tokens: TokenExpresion[] = [];
  let esPrimerTermino = true;

  coeficientes.forEach((coeficiente, indice) => {
    if (coeficiente.esCero()) return;
    const nombre = nombres[indice]!;
    const negativo = coeficiente.esNegativa();
    const magnitud = coeficiente.abs();

    if (esPrimerTermino) {
      if (negativo) tokens.push({ tipo: "op", texto: MENOS_UI });
    } else {
      tokens.push({ tipo: "op", texto: negativo ? ` ${MENOS_UI} ` : " + " });
    }

    if (!magnitud.igual(Fraccion.UNO)) {
      tokens.push({ tipo: "coef", texto: formatearValorNumerico(magnitud, formato) });
    }
    tokens.push({ tipo: "var", texto: nombre });
    esPrimerTermino = false;
  });

  if (esPrimerTermino) {
    tokens.push({ tipo: "coef", texto: "0" });
  }

  return tokens;
}

/** Tokens de una restricción completa (expresión + relación + límite), con `Fraccion` ya calculadas. */
export function tokensRestriccionFraccion(
  coeficientes: readonly Fraccion[],
  nombres: readonly string[],
  relacion: Relacion,
  limite: Fraccion,
  formato: FormatoNumero,
): TokenExpresion[] {
  const simbolo = relacion === "<=" ? " ≤ " : relacion === ">=" ? " ≥ " : " = ";
  return [
    ...tokensExpresionFraccion(coeficientes, nombres, formato),
    { tipo: "rel", texto: simbolo },
    { tipo: "num", texto: formatearValorNumerico(limite, formato) },
  ];
}
