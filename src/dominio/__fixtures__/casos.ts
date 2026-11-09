/**
 * Fixtures de los casos de prueba de `docs/08-casos-de-prueba.md` (C1..C12 + C2-E).
 *
 * Transcripción de datos pura: no hay lógica de cálculo en este archivo.
 * Todos los números están como `string` (ej. "4", "1/3", "-5", "-M"), nunca como
 * `number`, porque se consumen por aritmética exacta (Fraccion / ValorM).
 *
 * `modelo` usa el tipo real `ModeloLineal` (`dominio/modelo/tipos.ts`). Para los campos
 * que docs/08 no provee (etiqueta/definición de variable, nombre de restricción) se usan
 * los valores por defecto documentados: etiqueta/definición en docs/03-dominio-y-validacion.md §2
 * ("x{i}" / "x{i} = variable de decisión {i}.") y nombre de restricción en
 * docs/06-ux-ui.md §3.3 ("Restricción n") — ver también el ejemplo de `ModeloLineal` completo
 * en docs/08-casos-de-prueba.md §2, que confirma ambos defaults y `origen: 'ejemplo'`.
 */

import type { ModeloLineal, Relacion, Restriccion, Variable } from "../modelo/tipos";

export type EstadoResultado = "optimo" | "infactible" | "no_acotado" | "optimos_alternativos";

/** Variable con etiqueta/definición por defecto (docs/03 §2). */
function variable(nombre: string): Variable {
  const indice = nombre.slice(1);
  return {
    nombre,
    etiqueta: nombre,
    definicion: `${nombre} = variable de decisión ${indice}.`,
  };
}

/** Restricción con nombre por defecto (docs/06-ux-ui.md §3.3: "Restricción n"). */
function restriccion(
  numero: number,
  coeficientes: string[],
  relacion: Relacion,
  limite: string,
): Restriccion {
  return { numero, nombre: `Restricción ${numero}`, coeficientes, relacion, limite };
}

/** Una iteración de la traza: `entra / sale / pivote`. `null` cuando no hay pivote (C8). */
export interface IteracionSimplex {
  entra: string;
  sale: string | null;
  pivote: string | null;
}

export interface VerticeCaso {
  /** Coordenadas (x1, x2) */
  punto: string[];
  z: string;
}

/** Fila de una tabla Simplex: coeficientes de las columnas y lado derecho aparte. */
export interface FilaTabla {
  fila: string;
  coeficientes: string[];
  rhs: string;
}

export interface RazonFila {
  fila: string;
  /** Valor de la razón, o "excluida" si la columna no tiene coeficiente positivo */
  valor: string;
}

export interface TablaTrasIteracion {
  filas: FilaTabla[];
  razones: RazonFila[];
}

export interface SolucionAlternativa {
  traza: IteracionSimplex[];
  solucion: Record<string, string>;
  z: string;
}

export interface ResultadoSimplex {
  estado: EstadoResultado;
  traza: IteracionSimplex[];
  /** Valores de las variables (básicas y no nulas), tal como aparecen en docs/08 */
  solucion?: Record<string, string>;
  z?: string;
  /** Avisos que docs/08 pide emitir: "no_entera", "empate" */
  avisos?: string[];
  /** Observaciones textuales de docs/08 (ej. "A2 = 3 básica al terminar") */
  notas?: string[];
  alternativa?: SolucionAlternativa;
}

export interface ResultadoGrafico {
  /** Sólo presente cuando docs/08 indica el estado explícitamente */
  estado?: EstadoResultado;
  vertices: VerticeCaso[];
  /** Texto literal de docs/08 cuando describe región o segmento */
  nota?: string;
  enteros?: {
    cantidadPuntosFactibles: string;
    mejor: VerticeCaso;
  };
}

export interface CasoPrueba {
  id: string;
  titulo: string;
  /** true sólo para los casos marcados "(ejemplo)" en docs/08 (C1..C4) */
  esEjemplo: boolean;
  /** Paso de normalización que docs/08 pide registrar */
  normalizacion?: string;
  /** Columnas de la tabla Simplex, cuando docs/08 las enumera */
  columnas?: string[];
  modelo: ModeloLineal;
  simplex: ResultadoSimplex;
  /** Fila Z inicial (antes del ajuste de M), cuando docs/08 la da */
  zInicial?: string[];
  /** Fila Z tras el ajuste de M, cuando docs/08 la da */
  zAjustada?: string[];
  /** Tabla completa tras la iteración 1 (sólo C1) */
  tablaTrasIteracion1?: TablaTrasIteracion;
  /** null cuando el caso no tiene método gráfico (3 variables o docs/08 lo indica) */
  grafico: ResultadoGrafico | null;
}

// ---------------------------------------------------------------------------
// C1 · Clase · ejemplo principal (ejemplo)
// ---------------------------------------------------------------------------

export const C1: CasoPrueba = {
  id: 'C1',
  titulo: 'Clase · ejemplo principal',
  esEjemplo: true,
  normalizacion: 'R2: -3x1 + 2x2 >= -18 se normaliza a 3x1 - 2x2 <= 18',
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['3', '2'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '5'], '<=', '35'),
      restriccion(2, ['-3', '2'], '>=', '-18'),
      restriccion(3, ['2', '4'], '<=', '26'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x1', sale: 'S2', pivote: '3' },
      { entra: 'x2', sale: 'S3', pivote: '16/3' },
    ],
    solucion: { x1: '31/4', x2: '21/8', S1: '51/8' },
    z: '57/2',
  },
  tablaTrasIteracion1: {
    filas: [
      { fila: 'S1', coeficientes: ['0', '19/3', '1', '-2/3', '0'], rhs: '23' },
      { fila: 'x1', coeficientes: ['1', '-2/3', '0', '1/3', '0'], rhs: '6' },
      { fila: 'S3', coeficientes: ['0', '16/3', '0', '-2/3', '1'], rhs: '14' },
      { fila: 'Z', coeficientes: ['0', '-4', '0', '1', '0'], rhs: '18' },
    ],
    razones: [
      { fila: 'S1', valor: '69/19' },
      { fila: 'x1', valor: 'excluida' },
      { fila: 'S3', valor: '21/8' },
    ],
  },
  grafico: {
    vertices: [
      { punto: ['0', '0'], z: '0' },
      { punto: ['6', '0'], z: '18' },
      { punto: ['31/4', '21/8'], z: '57/2' },
      { punto: ['0', '13/2'], z: '13' },
    ],
  },
};

// ---------------------------------------------------------------------------
// C2 · Actividad en clase (ejemplo)
// ---------------------------------------------------------------------------

export const C2: CasoPrueba = {
  id: 'C2',
  titulo: 'Actividad en clase',
  esEjemplo: true,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['3', '5'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '1'], '<=', '8'),
      restriccion(2, ['1', '2'], '<=', '8'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x2', sale: 'S2', pivote: '2' },
      { entra: 'x1', sale: 'S1', pivote: '3/2' },
    ],
    solucion: { x1: '8/3', x2: '8/3' },
    z: '64/3',
  },
  grafico: {
    vertices: [
      { punto: ['0', '0'], z: '0' },
      { punto: ['4', '0'], z: '12' },
      { punto: ['8/3', '8/3'], z: '64/3' },
      { punto: ['0', '4'], z: '20' },
    ],
  },
};

// ---------------------------------------------------------------------------
// C2-E · Igual a C2 con naturaleza = 'entera'
// docs/08 no da traza propia: dice "misma solución", así que se usa la de C2.
// ---------------------------------------------------------------------------

export const C2_E: CasoPrueba = {
  id: 'C2-E',
  titulo: 'Igual a C2 con naturaleza entera',
  esEjemplo: false,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['3', '5'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '1'], '<=', '8'),
      restriccion(2, ['1', '2'], '<=', '8'),
    ],
    naturaleza: 'entera',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x2', sale: 'S2', pivote: '2' },
      { entra: 'x1', sale: 'S1', pivote: '3/2' },
    ],
    solucion: { x1: '8/3', x2: '8/3' },
    z: '64/3',
    avisos: ['no_entera'],
  },
  grafico: {
    vertices: [],
    enteros: {
      cantidadPuntosFactibles: '17',
      mejor: { punto: ['2', '3'], z: '21' },
    },
  },
};

// ---------------------------------------------------------------------------
// C3 · Compromiso (ejemplo)
// ---------------------------------------------------------------------------

export const C3: CasoPrueba = {
  id: 'C3',
  titulo: 'Compromiso',
  esEjemplo: true,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['4', '3'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '1'], '<=', '12'),
      restriccion(2, ['1', '1'], '<=', '7'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x1', sale: 'S1', pivote: '2' },
      { entra: 'x2', sale: 'S2', pivote: '1/2' },
    ],
    solucion: { x1: '5', x2: '2' },
    z: '26',
  },
  grafico: {
    vertices: [
      { punto: ['0', '0'], z: '0' },
      { punto: ['6', '0'], z: '24' },
      { punto: ['5', '2'], z: '26' },
      { punto: ['0', '7'], z: '21' },
    ],
  },
};

// ---------------------------------------------------------------------------
// C4 · Ejercicio 2 (ejemplo)
// ---------------------------------------------------------------------------

export const C4: CasoPrueba = {
  id: 'C4',
  titulo: 'Ejercicio 2',
  esEjemplo: true,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['6', '4'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '1'], '<=', '14'),
      restriccion(2, ['1', '3'], '<=', '18'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x1', sale: 'S1', pivote: '2' },
      { entra: 'x2', sale: 'S2', pivote: '5/2' },
    ],
    solucion: { x1: '24/5', x2: '22/5' },
    z: '232/5',
  },
  grafico: {
    vertices: [
      { punto: ['0', '0'], z: '0' },
      { punto: ['7', '0'], z: '42' },
      { punto: ['24/5', '22/5'], z: '232/5' },
      { punto: ['0', '6'], z: '24' },
    ],
  },
};

// ---------------------------------------------------------------------------
// C5 · Minimización con >= (Gran M)
// ---------------------------------------------------------------------------

export const C5: CasoPrueba = {
  id: 'C5',
  titulo: 'Minimización con >= (Gran M)',
  esEjemplo: false,
  columnas: ['x1', 'x2', 'S1', 'S2', 'A1', 'A2'],
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'min', coeficientes: ['2', '3'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['1', '1'], '>=', '4'),
      restriccion(2, ['1', '3'], '>=', '6'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x2', sale: 'A2', pivote: '3' },
      { entra: 'x1', sale: 'A1', pivote: '2/3' },
    ],
    solucion: { x1: '3', x2: '1' },
    z: '9',
  },
  zInicial: ['-2', '-3', '0', '0', '-M', '-M', '0'],
  zAjustada: ['-2 + 2M', '-3 + 4M', '-M', '-M', '0', '0', '10M'],
  grafico: {
    estado: 'optimo',
    vertices: [
      { punto: ['0', '4'], z: '12' },
      { punto: ['3', '1'], z: '9' },
      { punto: ['6', '0'], z: '12' },
    ],
    nota: 'Región no acotada; óptimo acotado.',
  },
};

// ---------------------------------------------------------------------------
// C6 · Restricción de igualdad
// ---------------------------------------------------------------------------

export const C6: CasoPrueba = {
  id: 'C6',
  titulo: 'Restricción de igualdad',
  esEjemplo: false,
  columnas: ['x1', 'x2', 'S2', 'A1'],
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['1', '2'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['1', '1'], '=', '5'),
      restriccion(2, ['1', '0'], '<=', '3'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [{ entra: 'x2', sale: 'A1', pivote: '1' }],
    solucion: { x2: '5', S2: '3' },
    z: '10',
  },
  grafico: {
    vertices: [
      { punto: ['0', '5'], z: '10' },
      { punto: ['3', '2'], z: '7' },
    ],
    nota: 'Región = segmento entre (0,5) Z=10 y (3,2) Z=7.',
  },
};

// ---------------------------------------------------------------------------
// C7 · Infactible
// ---------------------------------------------------------------------------

export const C7: CasoPrueba = {
  id: 'C7',
  titulo: 'Infactible',
  esEjemplo: false,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['1', '1'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['1', '1'], '<=', '2'),
      restriccion(2, ['1', '1'], '>=', '5'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'infactible',
    traza: [{ entra: 'x1', sale: 'S1', pivote: '1' }],
    notas: ['Termina con A2 = 3 básica.'],
  },
  grafico: {
    estado: 'infactible',
    vertices: [],
    nota: 'Sin puntos factibles.',
  },
};

// ---------------------------------------------------------------------------
// C8 · No acotado
// ---------------------------------------------------------------------------

export const C8: CasoPrueba = {
  id: 'C8',
  titulo: 'No acotado',
  esEjemplo: false,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['1', '1'], simbolo: 'Z' },
    restricciones: [restriccion(1, ['1', '-1'], '<=', '1')],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'no_acotado',
    traza: [
      { entra: 'x1', sale: 'S1', pivote: '1' },
      // docs/08: "entra x2, ninguna razón válida"; no hay pivote en esta iteración.
      { entra: 'x2', sale: null, pivote: null },
    ],
  },
  grafico: {
    estado: 'no_acotado',
    vertices: [],
  },
};

// ---------------------------------------------------------------------------
// C9 · Óptimos alternativos
// ---------------------------------------------------------------------------

export const C9: CasoPrueba = {
  id: 'C9',
  titulo: 'Óptimos alternativos',
  esEjemplo: false,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['2', '4'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['1', '2'], '<=', '8'),
      restriccion(2, ['1', '0'], '<=', '6'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimos_alternativos',
    traza: [{ entra: 'x2', sale: 'S1', pivote: '2' }],
    solucion: { x2: '4', S2: '6' },
    z: '16',
    notas: ['En la tabla óptima x1 (no básica) tiene coste reducido 0.'],
    alternativa: {
      traza: [{ entra: 'x1', sale: 'S2', pivote: '1' }],
      solucion: { x1: '6', x2: '1' },
      z: '16',
    },
  },
  grafico: {
    vertices: [
      { punto: ['0', '4'], z: '16' },
      { punto: ['6', '1'], z: '16' },
    ],
    nota: 'Segmento óptimo entre (0,4) y (6,1).',
  },
};

// ---------------------------------------------------------------------------
// C10 · Tres variables
// ---------------------------------------------------------------------------

export const C10: CasoPrueba = {
  id: 'C10',
  titulo: 'Tres variables',
  esEjemplo: false,
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2'), variable('x3')],
    objetivo: { sentido: 'max', coeficientes: ['5', '4', '3'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['2', '3', '1'], '<=', '5'),
      restriccion(2, ['4', '1', '2'], '<=', '11'),
      restriccion(3, ['3', '4', '2'], '<=', '8'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x1', sale: 'S1', pivote: '2' },
      { entra: 'x3', sale: 'S3', pivote: '1/2' },
    ],
    solucion: { x1: '2', x3: '1', S2: '1' },
    z: '13',
  },
  // docs/08: "Método gráfico: no disponible." (3 variables)
  grafico: null,
};

// ---------------------------------------------------------------------------
// C11 · Tres variables, mixto (min, >=, <=, =)
// ---------------------------------------------------------------------------

export const C11: CasoPrueba = {
  id: 'C11',
  titulo: 'Tres variables, mixto',
  esEjemplo: false,
  columnas: ['x1', 'x2', 'x3', 'S1', 'S2', 'A1', 'A3'],
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2'), variable('x3')],
    objetivo: { sentido: 'min', coeficientes: ['2', '3', '4'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['1', '1', '1'], '>=', '10'),
      restriccion(2, ['2', '1', '0'], '<=', '20'),
      restriccion(3, ['0', '1', '3'], '=', '9'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimo',
    traza: [
      { entra: 'x3', sale: 'A3', pivote: '3' },
      { entra: 'x1', sale: 'A1', pivote: '1' },
    ],
    solucion: { x1: '7', x3: '3', S2: '6' },
    z: '26',
  },
  // docs/08 no da gráfico para C11; con 3 variables el método gráfico no aplica.
  grafico: null,
};

// ---------------------------------------------------------------------------
// C12 · Lado derecho negativo con igualdad (normalización)
// ---------------------------------------------------------------------------

export const C12: CasoPrueba = {
  id: 'C12',
  titulo: 'Lado derecho negativo con igualdad',
  esEjemplo: false,
  normalizacion: 'R1: -x1 - x2 = -4 se normaliza a x1 + x2 = 4',
  columnas: ['x1', 'x2', 'S2', 'A1'],
  modelo: {
    version: 1,
    origen: 'ejemplo',
    variables: [variable('x1'), variable('x2')],
    objetivo: { sentido: 'max', coeficientes: ['1', '1'], simbolo: 'Z' },
    restricciones: [
      restriccion(1, ['-1', '-1'], '=', '-4'),
      restriccion(2, ['1', '0'], '<=', '3'),
    ],
    naturaleza: 'fraccionaria',
  },
  simplex: {
    estado: 'optimos_alternativos',
    traza: [
      { entra: 'x1', sale: 'S2', pivote: '1' },
      { entra: 'x2', sale: 'A1', pivote: '1' },
    ],
    solucion: { x1: '3', x2: '1' },
    z: '4',
    avisos: ['empate'],
    notas: ['S2 no básica con coste reducido 0.'],
  },
  zAjustada: ['-1 - M', '-1 - M', '0', '0', '-4M'],
  grafico: {
    estado: 'optimos_alternativos',
    vertices: [
      { punto: ['0', '4'], z: '4' },
      { punto: ['3', '1'], z: '4' },
    ],
    nota: 'Región = segmento (0,4)-(3,1), ambos con Z = 4.',
  },
};

/** Todos los casos de docs/08, en orden. */
export const CASOS: readonly CasoPrueba[] = [
  C1,
  C2,
  C2_E,
  C3,
  C4,
  C5,
  C6,
  C7,
  C8,
  C9,
  C10,
  C11,
  C12,
];
