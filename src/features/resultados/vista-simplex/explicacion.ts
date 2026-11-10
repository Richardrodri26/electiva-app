/**
 * Explicación en vocabulario de clase de la decisión tomada en una tabla Simplex
 * (`features/resultados/vista-simplex/explicacion.ts`), docs/06-ux-ui.md §3.4:
 *
 * "Entra x₂ (−4 es el más negativo) · Sale S₃ (razón menor 21/8) · Pivote 16/3"
 *
 * Usa el vocabulario de docs/04-motor-simplex.md §3 ("condición de optimalidad", "variable
 * de entrada", "variable de salida", "elemento pivote"), nunca jerga del asistente (regla de
 * oro #5 de AGENTS.md no aplica acá: esta pestaña es intencionalmente técnica, igual que la
 * clase — ver docs/06 §3.4).
 *
 * Pura (sin React): solo lee la `TablaSimplex` y devuelve el texto a mostrar debajo de ella.
 */

import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { Sentido } from "@/dominio/modelo/tipos";
import type { DecisionIteracion, TablaSimplex } from "@/dominio/simplex/tipos";

import { formatearValorM } from "./formato-valor-m";

/**
 * Texto de una iteración (docs/06 §3.4), o `null` si `tabla` no tiene decisión (tabla final,
 * sin más candidatas que violen la condición de optimalidad).
 */
export function construirExplicacionDecision(
  tabla: TablaSimplex,
  sentido: Sentido,
  formato: FormatoNumero,
): string | null {
  const decision = tabla.decision;
  if (decision === undefined) {
    return null;
  }

  const esMax = sentido === "max";
  const valorEntrada = tabla.filaZ[decision.columnaPivote];
  const valorEntradaTexto = valorEntrada === undefined ? "" : formatearValorM(valorEntrada, formato);
  const calificador = esMax ? "más negativo" : "más positivo";

  const partes: string[] = [`Entra ${decision.entra} (${valorEntradaTexto} es el ${calificador})`];

  if (
    decision.sale !== undefined &&
    decision.filaPivote !== undefined &&
    decision.elementoPivote !== undefined
  ) {
    const razonFila = decision.razones[decision.filaPivote];
    const razonTexto =
      razonFila !== undefined && "valor" in razonFila ? formatearValorNumerico(razonFila.valor, formato) : "";
    partes.push(`Sale ${decision.sale} (razón menor ${razonTexto})`);
    partes.push(`Pivote ${formatearValorNumerico(decision.elementoPivote, formato)}`);
  } else {
    partes.push("Ninguna fila tiene una razón válida para salir (todos los coeficientes de la columna son ≤ 0)");
  }

  if (decision.empateEntrada || decision.empateSalida) {
    partes.push("hubo un empate; se eligió la primera opción (más a la izquierda / más arriba)");
  }

  return `${partes.join(" · ")}.`;
}

/**
 * Texto del pivoteo extra que produce la solución alternativa (docs/04-motor-simplex.md §4.3,
 * `resultado.alternativa`): a diferencia de `construirExplicacionDecision`, acá la columna que
 * entra NO viola la condición de optimalidad (su costo reducido es exactamente 0) — por eso
 * no tiene sentido decir "es el más negativo/positivo"; se explica la razón real: hay otro
 * vértice óptimo con el mismo Z.
 */
export function construirExplicacionAlternativa(decision: DecisionIteracion, formato: FormatoNumero): string {
  const partes: string[] = [
    `La columna ${decision.entra} tiene costo reducido 0 en la tabla óptima: pivotear sobre ella lleva a otro vértice con el mismo Z`,
  ];

  if (decision.sale !== undefined && decision.filaPivote !== undefined && decision.elementoPivote !== undefined) {
    const razonFila = decision.razones[decision.filaPivote];
    const razonTexto =
      razonFila !== undefined && "valor" in razonFila ? formatearValorNumerico(razonFila.valor, formato) : "";
    partes.push(`Sale ${decision.sale} (razón menor ${razonTexto})`);
    partes.push(`Pivote ${formatearValorNumerico(decision.elementoPivote, formato)}`);
  }

  return `${partes.join(" · ")}.`;
}
