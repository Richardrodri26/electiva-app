/**
 * Catálogos del asistente paso a paso (`dominio/modelo/catalogos.ts`).
 *
 * Transcripción LITERAL de los catálogos de `console-program/src/flow/*.ts` (etiquetas,
 * orden y valores de menú idénticos al CLI) — ver docs/03-dominio-y-validacion.md §2 y
 * AGENTS.md regla de oro #6 (fidelidad a la clase). No reescribir estas etiquetas de
 * memoria: ante cualquier duda, volver a leer el archivo fuente del CLI indicado en cada
 * bloque.
 *
 * `CANTIDADES_OPCIONES` y `CANTIDADES_RESTRICCIONES` quedan documentados tal cual el CLI
 * (menú cerrado de 2-3 / 2-4) a modo de referencia, pero el asistente web NO los usa como
 * menú cerrado: amplía el rango a 2..6 variables y 1..6 restricciones (ver `esquemas.ts`,
 * decisión confirmada en la tarea T1.2).
 */

import type { CategoriaId, MetaId, Naturaleza, Relacion, Sentido } from "./tipos";

/** Una opción de menú numerada — misma forma que `OpcionMenu` de `console-program/src/io/prompt.ts`. */
export interface OpcionMenu<TValor extends number = number> {
  valor: TValor;
  etiqueta: string;
}

// ---------------------------------------------------------------------------
// Etapa 1 — console-program/src/flow/definirVariables.ts
// ---------------------------------------------------------------------------

export const CATEGORIAS: OpcionMenu<CategoriaId>[] = [
  { valor: 1, etiqueta: "Productos" },
  { valor: 2, etiqueta: "Servicios" },
  { valor: 3, etiqueta: "Trabajos o proyectos" },
  { valor: 4, etiqueta: "Recursos tecnológicos" },
];

/** Verbo natural según la categoría elegida, usado para redactar la definición de cada variable. */
export const VERBOS_POR_CATEGORIA: Record<CategoriaId, string> = {
  1: "producirán",
  2: "prestarán",
  3: "realizarán",
  4: "contratarán",
};

/** Menú cerrado del CLI (2 o 3 opciones). Ver nota de cabecera: el asistente web no lo usa. */
export const CANTIDADES_OPCIONES: OpcionMenu[] = [
  { valor: 2, etiqueta: "2 opciones" },
  { valor: 3, etiqueta: "3 opciones" },
];

export const UNIDADES: OpcionMenu[] = [
  { valor: 1, etiqueta: "Unidades" },
  { valor: 2, etiqueta: "Horas" },
  { valor: 3, etiqueta: "Toneladas" },
  { valor: 4, etiqueta: "GB" },
  { valor: 5, etiqueta: "Servicios" },
  { valor: 6, etiqueta: "Otra" },
];

/** Valor de `UNIDADES` que pide escribir la unidad a mano ("Otra"). */
export const VALOR_UNIDAD_OTRA = 6;

// ---------------------------------------------------------------------------
// Etapa 2 — console-program/src/flow/definirObjetivo.ts
// ---------------------------------------------------------------------------

export const METAS: OpcionMenu<MetaId>[] = [
  { valor: 1, etiqueta: "Mayor utilidad" },
  { valor: 2, etiqueta: "Mayor ingreso" },
  { valor: 3, etiqueta: "Más solicitudes atendidas" },
  { valor: 4, etiqueta: "Menor costo" },
  { valor: 5, etiqueta: "Menor tiempo" },
  { valor: 6, etiqueta: "Menor uso de recursos" },
];

/**
 * Regla exacta de `console-program/src/flow/definirObjetivo.ts`:
 * `const sentido: Sentido = metaValor <= 3 ? 'max' : 'min';`
 */
export function sentidoDesdeMeta(meta: MetaId): Sentido {
  return meta <= 3 ? "max" : "min";
}

// ---------------------------------------------------------------------------
// Etapa 3 — console-program/src/flow/definirRestricciones.ts
// ---------------------------------------------------------------------------

export const TIPOS_RESTRICCION: OpcionMenu[] = [
  { valor: 1, etiqueta: "Presupuesto" },
  { valor: 2, etiqueta: "Horas" },
  { valor: 3, etiqueta: "Procesamiento" },
  { valor: 4, etiqueta: "Memoria o almacenamiento" },
  { valor: 5, etiqueta: "Cantidad máxima" },
  { valor: 6, etiqueta: "Pedido mínimo" },
  { valor: 7, etiqueta: "Cantidad total" },
  { valor: 8, etiqueta: "Otra" },
];

/** Valor de `TIPOS_RESTRICCION` que pide escribir el nombre a mano ("Otra"). */
export const VALOR_TIPO_RESTRICCION_OTRA = 8;

/** Menú cerrado del CLI (2, 3 o 4 limitaciones). Ver nota de cabecera: el asistente web no lo usa. */
export const CANTIDADES_RESTRICCIONES: OpcionMenu[] = [
  { valor: 2, etiqueta: "2 limitaciones" },
  { valor: 3, etiqueta: "3 limitaciones" },
  { valor: 4, etiqueta: "4 limitaciones" },
];

export const FORMAS_CUMPLIMIENTO: OpcionMenu[] = [
  { valor: 1, etiqueta: "No se puede superar" },
  { valor: 2, etiqueta: "Se debe alcanzar como mínimo" },
  { valor: 3, etiqueta: "Se debe cumplir exactamente" },
];

/**
 * Regla exacta de `console-program/src/flow/definirRestricciones.ts`
 * (función `relacionDesdeForma`): 1 → `'<='`, 2 → `'>='`, cualquier otro → `'='`.
 */
export function relacionDesdeFormaCumplimiento(formaValor: number): Relacion {
  if (formaValor === 1) return "<=";
  if (formaValor === 2) return ">=";
  return "=";
}

// ---------------------------------------------------------------------------
// Etapa 4 — console-program/src/flow/definirNaturaleza.ts
// ---------------------------------------------------------------------------

export const OPCIONES_NATURALEZA: OpcionMenu[] = [
  { valor: 1, etiqueta: "Deben ser unidades completas (enteras)" },
  { valor: 2, etiqueta: "Pueden ser fraccionarias (decimales)" },
];

/**
 * Regla exacta de `console-program/src/flow/definirNaturaleza.ts`:
 * `return valor === 1 ? 'entera' : 'fraccionaria';`
 */
export function naturalezaDesdeOpcion(valor: number): Naturaleza {
  return valor === 1 ? "entera" : "fraccionaria";
}
