/**
 * Interpretación en lenguaje cotidiano del resultado del Simplex
 * (`dominio/simplex/interpretar.ts`), docs/04-motor-simplex.md §5-6.
 *
 * Dominio puro (AGENTS.md regla de oro #1): nada de React/Next. Las frases se calculan
 * sobre `Fraccion` (regla de oro #2) y solo se convierten a texto al final, respetando
 * el toggle fracción/decimal (`FormatoNumero`).
 *
 * Regla de oro #5: nunca usa vocabulario técnico ("coeficiente", "lado derecho",
 * "función objetivo", "restricción"); las frases usan el nombre de la restricción
 * (o "Restricción n" por defecto) y, para las variables, el verbo/unidad del
 * asistente (`VERBOS_POR_CATEGORIA`, `console-program/src/flow/definirVariables.ts`).
 *
 * IMPORTANTE (docs/04 §5): las frases de restricciones se calculan sobre los valores
 * ORIGINALES de `ModeloLineal.restricciones` (antes de la normalización de límites
 * negativos que hace `estandarizar.ts` para armar la tabla inicial), para no confundir
 * al usuario con el cambio de signo que es puramente interno del motor.
 */

import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import { METAS, VERBOS_POR_CATEGORIA } from "../modelo/catalogos";
import { formatearValorNumerico, type FormatoNumero } from "../modelo/formato";
import type { ContextoAsistente, ModeloLineal, Objetivo, Restriccion, Variable } from "../modelo/tipos";
import type { ResultadoSimplex, Solucion } from "./tipos";

// ---------------------------------------------------------------------------
// Variables de decisión (docs/04 §5, primer punto)
// ---------------------------------------------------------------------------

/**
 * Texto de la unidad para intercalar en la frase, en minúscula y con un espacio final
 * (o `""` si la unidad es "Unidades", como en `console-program/src/flow/definirVariables.ts`
 * — se omite para no decir "unidades de Mesas").
 */
function construirUnidadTexto(unidad: string): string {
  const normalizada = unidad.trim().toLowerCase();
  if (normalizada === "unidades") {
    return "";
  }
  return `${normalizada} `;
}

/**
 * Frase de una variable de decisión (docs/04 §5):
 * - Con `contexto` (asistente): `"Se {verbo} {valor} {unidad} de {etiqueta}."`, verbo en
 *   futuro desde `VERBOS_POR_CATEGORIA` (ej. "Se producirán 31/4 de Mesas.").
 * - Sin `contexto` (editor técnico): `"{nombre} = {valor}"` (ej. "x1 = 31/4").
 */
export function interpretarVariable(
  variable: Variable,
  valor: Fraccion,
  contexto: ContextoAsistente | undefined,
  formato: FormatoNumero = "fraccion",
): string {
  const valorTexto = formatearValorNumerico(valor, formato);

  if (contexto === undefined) {
    return `${variable.nombre} = ${valorTexto}`;
  }

  const verbo = VERBOS_POR_CATEGORIA[contexto.categoria];
  const unidadTexto = construirUnidadTexto(contexto.unidad);
  return `Se ${verbo} ${valorTexto} ${unidadTexto}de ${variable.etiqueta}.`;
}

// ---------------------------------------------------------------------------
// Restricciones (docs/04 §5, segundo punto)
// ---------------------------------------------------------------------------

/**
 * `usado = Σ aᵢⱼ xⱼ`, con los coeficientes ORIGINALES de la restricción (antes de
 * normalizar) y los valores de la solución para las variables de decisión del modelo.
 */
function calcularUsado(restriccion: Restriccion, variables: readonly Variable[], valores: Record<string, Fraccion>): Fraccion {
  return restriccion.coeficientes.reduce((acumulado, coeficienteTexto, indice) => {
    const coeficiente = parsearFraccion(coeficienteTexto);
    const variable = variables[indice];
    if (variable === undefined) {
      throw new Error(`No hay variable registrada en la posición ${indice} del modelo.`);
    }
    const valorVariable = valores[variable.nombre] ?? Fraccion.CERO;
    return acumulado.sumar(coeficiente.multiplicar(valorVariable));
  }, Fraccion.CERO);
}

/**
 * Frase de una restricción (docs/04 §5), calculada sobre los valores ORIGINALES
 * (ver nota de cabecera): holgura para `≤`, exceso para `≥`, cumplimiento exacto para `=`.
 */
export function interpretarRestriccion(
  restriccion: Restriccion,
  variables: readonly Variable[],
  valores: Record<string, Fraccion>,
  formato: FormatoNumero = "fraccion",
): string {
  const limite = parsearFraccion(restriccion.limite);
  const usado = calcularUsado(restriccion, variables, valores);
  const nombre = restriccion.nombre;

  if (restriccion.relacion === "<=") {
    const holgura = limite.restar(usado);
    if (holgura.esPositiva()) {
      const holguraTexto = formatearValorNumerico(holgura, formato);
      const usadoTexto = formatearValorNumerico(usado, formato);
      const limiteTexto = formatearValorNumerico(limite, formato);
      return `Sobran ${holguraTexto} de «${nombre}» (se usan ${usadoTexto} de ${limiteTexto}).`;
    }
    return `Se usa todo lo disponible de «${nombre}».`;
  }

  if (restriccion.relacion === ">=") {
    const exceso = usado.restar(limite);
    if (exceso.esPositiva()) {
      const excesoTexto = formatearValorNumerico(exceso, formato);
      return `Se supera el mínimo de «${nombre}» en ${excesoTexto}.`;
    }
    return `Se cumple justo el mínimo de «${nombre}».`;
  }

  return `«${nombre}» se cumple exactamente.`;
}

// ---------------------------------------------------------------------------
// Objetivo (docs/04 §5, tercer punto)
// ---------------------------------------------------------------------------

/**
 * Frase del objetivo (docs/04 §5): `"{etiqueta de la meta}: Z = {z}"` cuando el modelo
 * viene del asistente (tiene `meta`), o `"Máximo/Mínimo de Z = {z}"` sin meta (editor).
 */
export function interpretarObjetivo(objetivo: Objetivo, z: Fraccion, formato: FormatoNumero = "fraccion"): string {
  const zTexto = formatearValorNumerico(z, formato);
  const palabraSentido = objetivo.sentido === "max" ? "Máximo" : "Mínimo";

  if (objetivo.meta !== undefined) {
    const meta = METAS.find((opcion) => opcion.valor === objetivo.meta);
    const etiqueta = meta?.etiqueta ?? palabraSentido;
    return `${etiqueta}: Z = ${zTexto}`;
  }

  return `${palabraSentido} de Z = ${zTexto}`;
}

// ---------------------------------------------------------------------------
// Interpretación completa del resultado
// ---------------------------------------------------------------------------

export interface InterpretacionResultado {
  variables: string[];
  restricciones: string[];
  objetivo: string;
}

/**
 * Interpretación completa de un `ResultadoSimplex` resuelto (docs/04 §5): una frase por
 * variable de decisión, una por restricción y la del objetivo. `undefined` si el estado
 * no tiene `solucion` (`no_acotado`, `infactible`, `limite_iteraciones`) — no hay nada
 * que interpretar en lenguaje cotidiano en ese caso.
 */
export function interpretarResultado(
  modelo: ModeloLineal,
  resultado: ResultadoSimplex,
  formato: FormatoNumero = "fraccion",
): InterpretacionResultado | undefined {
  if (resultado.solucion === undefined) {
    return undefined;
  }

  const { valores, z }: Solucion = resultado.solucion;

  const variables = modelo.variables.map((variable) =>
    interpretarVariable(variable, valores[variable.nombre] ?? Fraccion.CERO, modelo.contexto, formato),
  );
  const restricciones = modelo.restricciones.map((restriccion) =>
    interpretarRestriccion(restriccion, modelo.variables, valores, formato),
  );
  const objetivo = interpretarObjetivo(modelo.objetivo, z, formato);

  return { variables, restricciones, objetivo };
}

// ---------------------------------------------------------------------------
// Recorrido del Simplex sobre el método gráfico (docs/04 §6)
// ---------------------------------------------------------------------------

/** Un punto `(x1, x2)` del recorrido del Simplex, para animarlo sobre el método gráfico. */
export interface PuntoRecorridoSimplex {
  x1: Fraccion;
  x2: Fraccion;
  /** `false` si en esta tabla alguna variable artificial básica tiene valor > 0 (docs/04 §6). */
  factible: boolean;
}

/**
 * Secuencia de puntos `(x1, x2)` por los que pasó el Simplex (docs/04 §6): la solución
 * básica de cada tabla (`resultado.tablas`, en orden), solo para modelos de 2 variables.
 * `factible = false` marca los puntos intermedios que no son factibles para el modelo
 * original porque alguna artificial básica sigue siendo > 0 (ej. C5, restricciones `≥`).
 */
export function recorridoSimplex(resultado: ResultadoSimplex, modelo: ModeloLineal): PuntoRecorridoSimplex[] {
  if (modelo.variables.length !== 2) {
    throw new Error("recorridoSimplex solo aplica a modelos de 2 variables (docs/04 §6).");
  }
  const [variableX1, variableX2] = modelo.variables;
  const idX1 = variableX1!.nombre;
  const idX2 = variableX2!.nombre;

  return resultado.tablas.map((tabla) => {
    const valorDe = (id: string): Fraccion => {
      const indiceFila = tabla.base.indexOf(id);
      return indiceFila === -1 ? Fraccion.CERO : tabla.ladoDerecho[indiceFila]!;
    };

    const factible = !tabla.base.some((nombreBasica, indiceFila) => {
      const columna = resultado.columnas.find((c) => c.id === nombreBasica);
      return columna?.tipo === "artificial" && tabla.ladoDerecho[indiceFila]!.esPositiva();
    });

    return { x1: valorDe(idX1), x2: valorDe(idX2), factible };
  });
}
