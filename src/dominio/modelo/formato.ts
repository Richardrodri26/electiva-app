/**
 * Formato de expresiones y del modelo completo (`dominio/modelo/formato.ts`).
 *
 * Port de `console-program/src/formatter.ts` con los cambios de
 * docs/03-dominio-y-validacion.md §4:
 * - Coeficientes negativos y fraccionarios con aritmética exacta (`Fraccion`),
 *   nunca `number` (regla de oro #2).
 * - Coeficiente `1` implícito (`x1`), `-1` como `(signo)x1` (sin el "1").
 * - Términos con coeficiente `0` se OMITEN; si todos son 0, el resultado es `"0"`.
 * - Dos salidas por expresión: tokens (para el componente `<Expresion>`, con el
 *   signo menos tipográfico U+2212) y texto plano (para "Copiar como texto",
 *   con el guion normal `-`), ambas respetando el toggle fracción/decimal.
 *
 * Dominio puro (regla de oro #1): sin React ni librerías de UI.
 */

import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import type { ModeloLineal, NumeroTexto, Relacion, Variable } from "./tipos";

/** Toggle fracción/decimal (`?num=` en la URL — ver docs/02-arquitectura.md §3). */
export type FormatoNumero = "fraccion" | "decimal";

/**
 * Token de una expresión, para que el componente `<Expresion>` renderice
 * subíndices (`x<sub>1</sub>`) y el toggle fracción/decimal sin reimplementar
 * las reglas de formato. Forma exacta de docs/03-dominio-y-validacion.md §4.
 */
export interface TokenExpresion {
  tipo: "coef" | "var" | "op" | "rel" | "num";
  texto: string;
}

/** Signo menos tipográfico (U+2212), usado en los tokens para la UI. */
const MENOS_UI = "−";
/** Guion normal, usado en el texto plano (copiar/exportar). */
const MENOS_TEXTO = "-";

/** `aTexto()` o `aDecimal()` según el toggle fracción/decimal. */
export function formatearValorNumerico(valor: Fraccion, formato: FormatoNumero = "fraccion"): string {
  return formato === "fraccion" ? valor.aTexto() : valor.aDecimal();
}

/**
 * Un término no nulo de una expresión: índice original (para ubicar la
 * variable correspondiente) y su valor exacto como `Fraccion`.
 */
interface TerminoNoNulo {
  indice: number;
  valor: Fraccion;
}

/** Parsea los coeficientes y descarta los que son cero (se omiten del formato). */
function obtenerTerminosNoNulos(coeficientes: NumeroTexto[]): TerminoNoNulo[] {
  return coeficientes
    .map((coeficienteTexto, indice) => ({ indice, valor: parsearFraccion(coeficienteTexto) }))
    .filter((termino) => !termino.valor.esCero());
}

/**
 * Construye los tokens de una expresión (suma de términos `coeficiente·variable`),
 * parametrizado por el signo menos a usar (tipográfico para la UI, guion normal
 * para el texto plano). Reglas:
 * - Términos en 0 se omiten; si no queda ningún término, el resultado es `[{tipo:'coef', texto:'0'}]`.
 * - Coeficiente `1` (o `-1`) implícito: no se muestra, solo el signo si corresponde.
 * - El signo del primer término solo se muestra si es negativo (sin "+" inicial).
 * - Los términos siguientes se unen con `" + "` o `" (signo) "` (con espacios, como en `ValorM.aTexto`).
 */
function construirTokensExpresion(
  coeficientes: NumeroTexto[],
  variables: Pick<Variable, "nombre">[],
  formato: FormatoNumero,
  signoMenos: string,
): TokenExpresion[] {
  const terminos = obtenerTerminosNoNulos(coeficientes);

  if (terminos.length === 0) {
    return [{ tipo: "coef", texto: "0" }];
  }

  const tokens: TokenExpresion[] = [];

  terminos.forEach((termino, posicion) => {
    const variable = variables[termino.indice];
    if (variable === undefined) {
      throw new Error(`No hay variable registrada en la posición ${termino.indice} del modelo.`);
    }

    const esNegativo = termino.valor.esNegativa();
    const magnitud = termino.valor.abs();

    if (posicion === 0) {
      if (esNegativo) {
        tokens.push({ tipo: "op", texto: signoMenos });
      }
    } else {
      tokens.push({ tipo: "op", texto: esNegativo ? ` ${signoMenos} ` : " + " });
    }

    if (!magnitud.igual(Fraccion.UNO)) {
      tokens.push({ tipo: "coef", texto: formatearValorNumerico(magnitud, formato) });
    }
    tokens.push({ tipo: "var", texto: variable.nombre });
  });

  return tokens;
}

/** Tokens de una expresión (objetivo o lado izquierdo de una restricción) para la UI. */
export function generarTokensExpresion(
  coeficientes: NumeroTexto[],
  variables: Variable[],
  formato: FormatoNumero = "fraccion",
): TokenExpresion[] {
  return construirTokensExpresion(coeficientes, variables, formato, MENOS_UI);
}

function simboloRelacionUI(relacion: Relacion): string {
  if (relacion === "<=") return " ≤ ";
  if (relacion === ">=") return " ≥ ";
  return " = ";
}

function simboloRelacionTexto(relacion: Relacion): string {
  return relacion;
}

/** Tokens de una restricción completa (expresión + relación + límite) para la UI. */
export function generarTokensRestriccion(
  coeficientes: NumeroTexto[],
  variables: Variable[],
  relacion: Relacion,
  limite: NumeroTexto,
  formato: FormatoNumero = "fraccion",
): TokenExpresion[] {
  const tokensExpresion = generarTokensExpresion(coeficientes, variables, formato);
  const limiteFraccion = parsearFraccion(limite);
  return [
    ...tokensExpresion,
    { tipo: "rel", texto: simboloRelacionUI(relacion) },
    { tipo: "num", texto: formatearValorNumerico(limiteFraccion, formato) },
  ];
}

/** Expresión en texto plano (para "Copiar como texto"): mismo armado, con guion normal. */
export function formatearExpresionTexto(
  coeficientes: NumeroTexto[],
  variables: Variable[],
  formato: FormatoNumero = "fraccion",
): string {
  return construirTokensExpresion(coeficientes, variables, formato, MENOS_TEXTO)
    .map((token) => token.texto)
    .join("");
}

export function formatearVariablesTexto(modelo: ModeloLineal): string[] {
  return modelo.variables.map((variable) => variable.definicion);
}

export function formatearFuncionObjetivoTexto(modelo: ModeloLineal, formato: FormatoNumero = "fraccion"): string {
  const palabra = modelo.objetivo.sentido === "max" ? "Maximizar" : "Minimizar";
  const expresion = formatearExpresionTexto(modelo.objetivo.coeficientes, modelo.variables, formato);
  return `${palabra} ${modelo.objetivo.simbolo} = ${expresion}`;
}

export function formatearRestriccionesTexto(modelo: ModeloLineal, formato: FormatoNumero = "fraccion"): string[] {
  return modelo.restricciones.map((restriccion) => {
    const expresion = formatearExpresionTexto(restriccion.coeficientes, modelo.variables, formato);
    const limite = formatearValorNumerico(parsearFraccion(restriccion.limite), formato);
    return `${restriccion.numero}. ${restriccion.nombre}: ${expresion} ${simboloRelacionTexto(restriccion.relacion)} ${limite}`;
  });
}

export function formatearCondicionesTexto(modelo: ModeloLineal): string {
  const nombres = modelo.variables.map((variable) => variable.nombre).join(", ");
  if (modelo.naturaleza === "entera") {
    return `${nombres} son números enteros no negativos.`;
  }
  return `${nombres} >= 0.`;
}

function construirCuerpoTexto(modelo: ModeloLineal, formato: FormatoNumero): string {
  const lineas: string[] = [];
  lineas.push("Variables de decisión:");
  lineas.push(...formatearVariablesTexto(modelo));
  lineas.push("");
  lineas.push("Función objetivo:");
  lineas.push(formatearFuncionObjetivoTexto(modelo, formato));
  lineas.push("");
  lineas.push("Restricciones:");
  lineas.push(...formatearRestriccionesTexto(modelo, formato));
  lineas.push("");
  lineas.push("Condiciones:");
  lineas.push(formatearCondicionesTexto(modelo));
  return lineas.join("\n");
}

/** Texto completo del modelo ("Copiar como texto"), misma estructura que el CLI. */
export function formatearModeloTexto(modelo: ModeloLineal, formato: FormatoNumero = "fraccion"): string {
  return `MODELO GENERADO\n\n${construirCuerpoTexto(modelo, formato)}`;
}

/** Resumen del asistente antes de confirmar ("¿Los datos registrados son correctos?"). */
export function formatearResumenTexto(modelo: ModeloLineal, formato: FormatoNumero = "fraccion"): string {
  return `RESUMEN DE LOS DATOS CAPTURADOS\n\n${construirCuerpoTexto(modelo, formato)}`;
}
