/**
 * Descripción en texto de las `OperacionFila` del pivoteo Gauss-Jordan
 * (`features/resultados/vista-simplex/operaciones.ts`), docs/04-motor-simplex.md §3.5:
 *
 * - `normalizar`: "Fila {entra} ← Fila {sale} ÷ {divisor}".
 * - `eliminar`: "Fila {fila} ← Fila {fila} − ({factor})·(nueva fila {filaOrigen})".
 *
 * También identifica, para una tabla + su decisión, qué filas NO tuvieron una operación
 * (factor 0 en la columna pivote) — docs/04 §3.5: "las filas con factor 0 no cambian;
 * indicarlo en la UI".
 */

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import type { ValorM } from "@/dominio/aritmetica/valor-m";
import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { DecisionIteracion, OperacionFila, TablaSimplex } from "@/dominio/simplex/tipos";

import { formatearValorM } from "./formato-valor-m";

function esFraccion(valor: Fraccion | ValorM): valor is Fraccion {
  return valor instanceof Fraccion;
}

/**
 * Texto en español de una operación de fila, en el vocabulario de la clase (docs/04 §3.5).
 * `filaAnteriorEntrada` es el nombre de la fila ANTES del pivoteo (la variable que sale,
 * `decision.sale`), solo necesario para `normalizar` (ej. "Fila x1 ← Fila S2 ÷ 3"); el
 * ajuste de M (docs/04 §2.5) nunca tiene operaciones `normalizar`, así que ahí se omite.
 */
export function describirOperacion(
  operacion: OperacionFila,
  formato: FormatoNumero,
  filaAnteriorEntrada?: string,
): string {
  if (operacion.tipo === "normalizar") {
    const divisorTexto = formatearValorNumerico(operacion.divisor, formato);
    const filaAnterior = filaAnteriorEntrada ?? operacion.fila;
    return `Fila ${operacion.fila} ← Fila ${filaAnterior} ÷ ${divisorTexto}`;
  }

  const factorTexto = esFraccion(operacion.factor)
    ? formatearValorNumerico(operacion.factor, formato)
    : formatearValorM(operacion.factor, formato);
  return `Fila ${operacion.fila} ← Fila ${operacion.fila} − (${factorTexto})·(nueva fila ${operacion.filaOrigen})`;
}

/**
 * Nombres de las filas de `tabla` (incluida "Z") que NO cambiaron en el pivoteo de `decision`
 * porque su coeficiente en la columna pivote era 0 (docs/04 §3.5). Excluye la fila que sale
 * (esa siempre cambia: es la que se normaliza).
 */
export function filasSinCambio(tabla: TablaSimplex, decision: DecisionIteracion): string[] {
  const filasConOperacionEliminar = new Set(
    decision.operaciones.filter((op) => op.tipo === "eliminar").map((op) => op.fila),
  );

  const nombresDeFilas = tabla.base.filter((nombre) => nombre !== decision.sale);
  const sinCambio = nombresDeFilas.filter((nombre) => !filasConOperacionEliminar.has(nombre));

  if (!filasConOperacionEliminar.has("Z")) {
    sinCambio.push("Z");
  }

  return sinCambio;
}
