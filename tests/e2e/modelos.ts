/**
 * Modelos de `docs/08-casos-de-prueba.md` armados como `ModeloLineal` para generar enlaces
 * `/resolver?m=…` sin pasar por la UI. Usa `serializarModelo` del dominio (TypeScript puro,
 * sin React ni Next), así el enlace es exactamente el que produce la aplicación.
 */

import { serializarModelo } from "../../src/dominio/modelo/serializacion";
import type { ModeloLineal, Relacion } from "../../src/dominio/modelo/tipos";

interface RestriccionSimple {
  coeficientes: [string, string];
  relacion: Relacion;
  limite: string;
}

function modeloDeDosVariables(
  sentido: "max" | "min",
  objetivo: [string, string],
  restricciones: RestriccionSimple[],
): ModeloLineal {
  return {
    version: 1,
    origen: "editor",
    variables: [
      { nombre: "x1", etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
      { nombre: "x2", etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
    ],
    objetivo: { sentido, coeficientes: objetivo, simbolo: "Z" },
    restricciones: restricciones.map((restriccion, indice) => ({
      numero: indice + 1,
      nombre: `Restricción ${indice + 1}`,
      coeficientes: restriccion.coeficientes,
      relacion: restriccion.relacion,
      limite: restriccion.limite,
    })),
    naturaleza: "fraccionaria",
  };
}

/** C7 (docs/08): max Z = x1 + x2; x1 + x2 ≤ 2; x1 + x2 ≥ 5. */
export const C7_INFACTIBLE = modeloDeDosVariables("max", ["1", "1"], [
  { coeficientes: ["1", "1"], relacion: "<=", limite: "2" },
  { coeficientes: ["1", "1"], relacion: ">=", limite: "5" },
]);

/** C8 (docs/08): max Z = x1 + x2; x1 − x2 ≤ 1. */
export const C8_NO_ACOTADO = modeloDeDosVariables("max", ["1", "1"], [
  { coeficientes: ["1", "-1"], relacion: "<=", limite: "1" },
]);

/** Ruta de `/resolver` para un modelo y una vista. */
export function urlResolver(modelo: ModeloLineal, vista: "modelo" | "grafico" | "simplex" | "interpretacion"): string {
  return `/resolver?m=${serializarModelo(modelo)}&vista=${vista}`;
}
