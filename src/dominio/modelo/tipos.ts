/**
 * Tipos del dominio para el modelo de programación lineal (`dominio/modelo/tipos.ts`).
 *
 * Extienden los del CLI (`console-program/src/types.ts`) con lo que agrega la app web:
 * `version`, `origen`, `contexto` (asistente), `meta` (asistente) — ver
 * docs/03-dominio-y-validacion.md §2.
 *
 * Dominio puro (AGENTS.md regla de oro #1): nada de React/Next/UI, solo TypeScript.
 * Cero `number` en los valores del modelo (regla de oro #2): los coeficientes y
 * límites se guardan como `NumeroTexto` (texto normalizado) y solo se convierten a
 * `Fraccion`/`ValorM` dentro del motor Simplex o del método gráfico.
 */

export type Sentido = "max" | "min";

export type Relacion = "<=" | ">=" | "=";

export type Naturaleza = "entera" | "fraccionaria";

/** Texto numérico validado por Zod: `"12.5"`, `"-3"`, `"1/3"` (ver `esquemas.ts`). */
export type NumeroTexto = string;

/** Cómo se originó el modelo: el asistente paso a paso, el editor técnico, o un ejemplo de clase. */
export type Origen = "asistente" | "editor" | "ejemplo";

/**
 * Identificador de meta del asistente, 1..6 — ver `METAS` en `catalogos.ts`
 * (transcripción de `console-program/src/flow/definirObjetivo.ts`).
 */
export type MetaId = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Identificador de categoría del asistente, 1..4 — ver `CATEGORIAS` en `catalogos.ts`
 * (transcripción de `console-program/src/flow/definirVariables.ts`).
 */
export type CategoriaId = 1 | 2 | 3 | 4;

/** Una variable de decisión (x1, x2, ...) con su significado en lenguaje cotidiano. */
export interface Variable {
  /** Nombre simbólico usado en las fórmulas, ej: `"x1"`. Generado, nunca escrito por el usuario. */
  nombre: string;
  /** Nombre corto de la opción, ej: `"Mesas"`. */
  etiqueta: string;
  /** Definición completa en lenguaje natural, ej: `"x1 = cantidad de Mesas que se producirán."`. */
  definicion: string;
}

/** Función objetivo: qué se quiere lograr y cuánto aporta o cuesta cada variable. */
export interface Objetivo {
  sentido: Sentido;
  /** Meta elegida en el asistente (1..6). Ausente cuando el modelo viene del editor. */
  meta?: MetaId;
  /** Aportes/costos, en el mismo orden que `ModeloLineal.variables`. */
  coeficientes: NumeroTexto[];
  /** Símbolo usado para representar la función objetivo (siempre `"Z"`). */
  simbolo: "Z";
}

/** Una limitación/restricción del modelo. */
export interface Restriccion {
  /** Número de orden (1, 2, 3...), consecutivo. Se recalcula al guardar, no se valida. */
  numero: number;
  /** Nombre descriptivo, ej: `"Horas"`, o texto libre. */
  nombre: string;
  /** Aportes, en el mismo orden que `ModeloLineal.variables`. */
  coeficientes: NumeroTexto[];
  relacion: Relacion;
  /** Cantidad disponible, requerida o exacta (lado derecho de la restricción). */
  limite: NumeroTexto;
}

/** Categoría y unidad elegidas en el asistente, para redactar la interpretación final. */
export interface ContextoAsistente {
  categoria: CategoriaId;
  unidad: string;
}

/** Modelo de programación lineal completo, listo para resolver, graficar o formatear. */
export interface ModeloLineal {
  version: 1;
  /** Título opcional, para historial o ejemplos de clase. */
  titulo?: string;
  origen: Origen;
  /** Solo presente cuando `origen === 'asistente'`. */
  contexto?: ContextoAsistente;
  variables: Variable[];
  objetivo: Objetivo;
  restricciones: Restriccion[];
  naturaleza: Naturaleza;
}
