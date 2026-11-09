/**
 * Tipos del motor Simplex tabular con Gran M (`dominio/simplex/tipos.ts`).
 *
 * Espejo de la interfaz normativa de `docs/04-motor-simplex.md` §1-§4. Dominio puro
 * (AGENTS.md regla de oro #1): nada de React/Next. Cero `number` en los valores de la
 * tabla (regla de oro #2): todo es `Fraccion` (filas/lado derecho, nunca llevan M) o
 * `ValorM` (fila Z, que sí puede llevar M).
 */

import type { Fraccion } from "../aritmetica/fraccion";
import type { ValorM } from "../aritmetica/valor-m";
import type { Relacion } from "../modelo/tipos";

/** Estado final del Simplex (docs/04 §1). */
export type EstadoSimplex =
  | "optimo"
  | "optimos_alternativos"
  | "no_acotado"
  | "infactible"
  | "limite_iteraciones";

/** Tipo de una columna de la tabla (docs/04 §1, §2.2). */
export type TipoColumna = "decision" | "holgura" | "exceso" | "artificial";

/** Una columna de la tabla: variable de decisión, holgura, exceso o artificial. */
export interface ColumnaTabla {
  id: string;
  tipo: TipoColumna;
  /** Número de la restricción que originó la columna (S/A). Ausente para variables de decisión. */
  restriccion?: number;
}

/** Solución completa: todas las columnas (básicas = su R; no básicas = 0) y Z. */
export interface Solucion {
  valores: Record<string, Fraccion>;
  z: Fraccion;
}

/**
 * Una operación de fila del pivoteo Gauss-Jordan (docs/04 §3.5), para reconstruir
 * la tabla siguiente paso a paso en la UI.
 * - `normalizar`: la fila pivote se divide por el elemento pivote.
 * - `eliminar`: a otra fila (incluida Z) se le resta un múltiplo de la nueva fila pivote.
 *   En la fila Z el factor es un `ValorM` (puede llevar M); en las demás filas es `Fraccion`.
 */
export type OperacionFila =
  | { tipo: "normalizar"; fila: string; divisor: Fraccion }
  | { tipo: "eliminar"; fila: string; factor: Fraccion | ValorM };

/**
 * La decisión tomada en una tabla: qué entra, qué sale y cómo se pivotea, para pasar
 * a la tabla siguiente (docs/04 §3). Ausente en la tabla final.
 */
export interface DecisionIteracion {
  entra: string;
  columnaPivote: number;
  /** Una razón (o exclusión) por fila, en el mismo orden que `TablaSimplex.base`. */
  razones: Array<{ valor: Fraccion } | { excluida: "coeficiente_no_positivo" }>;
  /** Ausentes si `no_acotado` (ninguna fila participó de la razón mínima). */
  sale?: string;
  filaPivote?: number;
  elementoPivote?: Fraccion;
  empateEntrada: boolean;
  empateSalida: boolean;
  operaciones: OperacionFila[];
}

/** Una tabla del Simplex: básicas, coeficientes, fila Z y la decisión que produjo la siguiente. */
export interface TablaSimplex {
  /** 0 = tabla inicial (ya ajustada, sin M en las columnas básicas). */
  indice: number;
  /** Variable básica de cada fila, ej. `['S1', 'x1', 'S3']`. */
  base: string[];
  /** Coeficientes de cada fila, en el orden de `ResultadoSimplex.columnas`. Nunca llevan M. */
  filas: Fraccion[][];
  /** Columna "R" (lado derecho) de cada fila. */
  ladoDerecho: Fraccion[];
  /** Costos reducidos de la fila Z, en el orden de `ResultadoSimplex.columnas`. */
  filaZ: ValorM[];
  /** Columna R de la fila Z. */
  valorZ: ValorM;
  decision?: DecisionIteracion;
}

/**
 * Celda recalculada para el panel "Ver cálculo celda a celda" (docs/04 §3.5,
 * equivalente a las diapositivas 18-25). `T` es `Fraccion` para filas de restricción
 * y `ValorM` para la fila Z.
 */
export interface DetalleCelda<T = Fraccion | ValorM> {
  actual: T;
  factor: T;
  nuevoPivote: T;
  resultado: T;
}

/**
 * Un paso de la preparación de la tabla inicial (docs/04 §2), registrado en el orden
 * en que ocurre, para mostrarlo en la UI. No incluye texto en español prearmado: eso
 * es responsabilidad de la capa de presentación (`formato.ts` / `interpretar.ts`),
 * coherente con la regla de oro #1 (dominio puro) — ver nota de ambigüedad en el
 * resumen final sobre esta decisión.
 */
export type PasoPreparacion =
  | {
      /** §2.1: un lado derecho negativo se normaliza multiplicando la restricción por -1. */
      tipo: "normalizar_limite";
      restriccionNumero: number;
      relacionOriginal: Relacion;
      coeficientesOriginales: Fraccion[];
      limiteOriginal: Fraccion;
      relacionNormalizada: Relacion;
      coeficientesNormalizados: Fraccion[];
      limiteNormalizado: Fraccion;
    }
  | {
      /** §2.2/§2.3: variables de holgura/exceso/artificiales agregadas para una restricción. */
      tipo: "agregar_variables";
      restriccionNumero: number;
      /** Relación ya normalizada (post §2.1). */
      relacion: Relacion;
      variables: ColumnaTabla[];
      basicaInicial: string;
    }
  | {
      /** §2.4: fila Z canónica (`z - Σcⱼxⱼ ∓ M·Aᵢ = 0`), antes de eliminar M de las básicas. */
      tipo: "fila_z_canonica";
      filaZ: ValorM[];
    }
  | {
      /** §2.5: ajuste de M — se elimina M de las columnas con artificial básica. Da `tablas[0]`. */
      tipo: "ajuste_m";
      filaZAntes: ValorM[];
      filaZDespues: ValorM[];
      operaciones: OperacionFila[];
    };

/** Código de un aviso (docs/04 §4.4; `posible_ciclo` extiende la tabla — ver resumen final). */
export type CodigoAviso = "no_entera" | "degenerada" | "empate" | "objetivo_cero" | "posible_ciclo";

export interface Aviso {
  codigo: CodigoAviso;
  mensaje: string;
}

export interface OpcionesSimplex {
  /** Tope de iteraciones antes de reportar `limite_iteraciones`. Default 50 (docs/04 §3.6). */
  maxIteraciones?: number;
}

export interface ResultadoSimplex {
  estado: EstadoSimplex;
  /** Pasos de la preparación (§2), en orden. */
  preparacion: PasoPreparacion[];
  /** Orden fijo de columnas (§2.3): x → S → A. */
  columnas: ColumnaTabla[];
  /** `tablas[0]` = tabla inicial (ya ajustada); luego una por iteración. */
  tablas: TablaSimplex[];
  /** Presente si `estado ∈ {optimo, optimos_alternativos}`. */
  solucion?: Solucion;
  /** Presente si `estado = optimos_alternativos` y el pivoteo adicional fue posible (§4.3). */
  solucionAlternativa?: Solucion;
  avisos: Aviso[];
}
