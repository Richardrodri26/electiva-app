/**
 * Formato de `ValorM` para la pestaña Simplex (`features/resultados/vista-simplex/formato-valor-m.ts`).
 *
 * `dominio/aritmetica/valor-m.ts` ya tiene `ValorM.aTexto()`, pero esa representación siempre
 * usa fracciones (ej. `"2 - 3M"`). Acá se agrega el equivalente que respeta el toggle
 * fracción/decimal (`?num=`, ver `dominio/modelo/formato.ts`), para las celdas de la fila Z
 * que sí pueden llevar M (docs/04-motor-simplex.md §1, `TablaSimplex.filaZ`).
 *
 * Helper de presentación puro (sin React): vive en la feature y no en `dominio/**` porque
 * ese paquete ya está cerrado por el motor Simplex (AGENTS.md pide no tocarlo en esta tarea).
 */

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import type { ValorM } from "@/dominio/aritmetica/valor-m";
import type { FormatoNumero } from "@/dominio/modelo/formato";

/** `true` si el valor es exactamente `0 + 0M` (ni término constante ni término en M). */
export function esValorMCero(valor: ValorM): boolean {
  return valor.a.esCero() && valor.b.esCero();
}

/**
 * Magnitud de `valor`, negando ambos términos si `valor` es negativo (docs/04 §3.1: el orden
 * de `ValorM` compara primero `b`, luego `a`). Análogo a `Fraccion.abs()`, para anteponer el
 * signo una sola vez al construir una suma de términos (ej. en los pasos de preparación).
 */
export function absValorM(valor: ValorM): ValorM {
  return valor.esNegativo() ? valor.negar() : valor;
}

/**
 * `ValorM.aTexto()` respetando el toggle fracción/decimal: en modo `"fraccion"` delega
 * directamente en `aTexto()`; en modo `"decimal"` convierte el término constante con
 * `Fraccion.aDecimal()` y mantiene el término en M con la misma notación (`"M"`, `"3M"`,
 * `"-M"`), igual que `ValorM.aTexto()`.
 */
export function formatearValorM(valor: ValorM, formato: FormatoNumero): string {
  if (formato === "fraccion") {
    return valor.aTexto();
  }

  const hayA = !valor.a.esCero();
  const hayB = !valor.b.esCero();

  if (!hayA && !hayB) {
    return "0";
  }

  const aTexto = valor.a.aDecimal();
  if (!hayB) {
    return aTexto;
  }

  const bAbs = valor.b.abs();
  const terminoM = bAbs.igual(Fraccion.UNO) ? "M" : `${bAbs.aDecimal()}M`;

  if (!hayA) {
    return valor.b.esNegativa() ? `-${terminoM}` : terminoM;
  }

  const operador = valor.b.esNegativa() ? " - " : " + ";
  return `${aTexto}${operador}${terminoM}`;
}
