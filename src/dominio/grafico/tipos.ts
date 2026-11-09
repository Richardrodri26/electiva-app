/**
 * Tipos del método gráfico (`dominio/grafico/tipos.ts`) — ver docs/05-metodo-grafico.md §1.
 *
 * Dominio puro (AGENTS.md regla de oro #1): nada de React/Next/UI.
 * Cero `number` en los cálculos del solver (regla de oro #2), con la única excepción
 * explícitamente autorizada: `ResultadoGrafico.dominio`, que es pura presentación
 * (rango visible de la gráfica), no decide factibilidad ni optimalidad.
 */

import type { Fraccion } from "../aritmetica/fraccion";
import type { Relacion } from "../modelo/tipos";

/** Identificador de una recta: el número de restricción, o uno de los dos ejes (no negatividad). */
export type IdRecta = number | "eje_x1" | "eje_x2";

export type EstadoGrafico = "optimo" | "optimos_alternativos" | "no_acotado" | "infactible";

/** Punto del plano x1-x2, en aritmética exacta. */
export interface Punto {
  x1: Fraccion;
  x2: Fraccion;
}

/** Una recta `a1·x1 + a2·x2 (relacion) b`, con sus intersecciones con los ejes (si existen). */
export interface Recta {
  restriccion: IdRecta;
  a1: Fraccion;
  a2: Fraccion;
  b: Fraccion;
  relacion: Relacion;
  /** Intersección con el eje x1 (x2 = 0) y/o con el eje x2 (x1 = 0), si la recta los corta. */
  interceptos: { x1?: Fraccion; x2?: Fraccion };
}

/** Un vértice de la región factible. */
export interface Vertice {
  /** "A", "B", "C"… en orden angular antihorario, empezando por el más cercano al origen. */
  id: string;
  punto: Punto;
  z: Fraccion;
  /** Rectas que pasan exactamente por este punto (restricciones activas/binding). */
  restriccionesActivas: IdRecta[];
  esOptimo: boolean;
}

/** Un punto de coordenadas enteras dentro de la región factible (solo `naturaleza = 'entera'`). */
export interface PuntoEntero {
  punto: Punto;
  z: Fraccion;
}

export interface ResultadoGrafico {
  estado: EstadoGrafico;
  /** Una recta por restricción (ignorando las degeneradas `0x1 + 0x2` siempre verdaderas) + los dos ejes. */
  rectas: Recta[];
  /** Vértices de la región factible, en orden angular antihorario. */
  vertices: Vertice[];
  regionAcotada: boolean;
  optimo?: { punto: Punto; z: Fraccion };
  /** Presente solo en `optimos_alternativos` cuando el empate es entre dos vértices adyacentes. */
  segmentoOptimo?: [Punto, Punto];
  /** Solo si `naturaleza = 'entera'` y la región es acotada. Ausente si hay más de 2500 (ver `avisos`). */
  puntosEnteros?: PuntoEntero[];
  mejorEntero?: { punto: Punto; z: Fraccion };
  /**
   * Avisos en lenguaje claro (ej. "Hay demasiados puntos enteros para mostrarlos", docs/05 §2.1).
   *
   * NOTA DE AMBIGÜEDAD: este campo no está en la interfaz `ResultadoGrafico` de docs/05-metodo-grafico.md §1,
   * pero §2.1 exige explícitamente emitir ese aviso. Se agrega acá como extensión aditiva (mismo patrón que
   * `ResultadoSimplex.avisos` en los fixtures) en vez de inventar dónde meterlo o descartar el requisito.
   * Reportado en el resumen final para que se confirme o se mueva a otro lugar del contrato.
   */
  avisos?: string[];
  /** Rango visible de la gráfica. Única excepción a "cero `number`" (regla de oro #2): es pura presentación. */
  dominio: { x1: [number, number]; x2: [number, number] };
}
