/**
 * Motor Simplex tabular con Gran M (`dominio/simplex/resolver.ts`), docs/04-motor-simplex.md
 * §3 (iteración) y §4 (fin y diagnóstico). Parte de la tabla inicial ya ajustada que produce
 * `estandarizar.ts` y aplica las reglas de entrada/salida/pivoteo exactas de la clase.
 */

import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import { ValorM } from "../aritmetica/valor-m";
import type { ModeloLineal } from "../modelo/tipos";
import { estandarizar } from "./estandarizar";
import type {
  Aviso,
  ColumnaTabla,
  DecisionIteracion,
  DetalleCelda,
  EstadoSimplex,
  OpcionesSimplex,
  OperacionFila,
  ResultadoSimplex,
  Solucion,
  TablaSimplex,
} from "./tipos";

const MAX_ITERACIONES_DEFECTO = 50;

const TEXTO_AVISO: Record<string, string> = {
  no_entera:
    "La solución tiene valores con decimales, pero pediste cantidades enteras. Esta es la solución del modelo sin la condición de enteros; revisa el método gráfico para ver el mejor punto entero (solo con 2 variables).",
  degenerada: "Solución degenerada: una variable básica vale 0.",
  empate: "Hubo un empate; se eligió la primera opción (más a la izquierda / más arriba).",
  objetivo_cero: "Todas las opciones aportan 0: cualquier punto factible es óptimo.",
  posible_ciclo: "Se alcanzó el límite de iteraciones; es posible que el método esté ciclando sin converger.",
};

function esValorMCero(v: ValorM): boolean {
  return v.a.esCero() && v.b.esCero();
}

/** `true` si `v` es estrictamente positivo (ni cero ni negativo), en el orden de `ValorM`. */
function esValorMPositivo(v: ValorM): boolean {
  return !v.esNegativo() && !esValorMCero(v);
}

/**
 * `true` si alguna variable BÁSICA de tipo `artificial` tiene valor (lado derecho) > 0
 * (docs/04 §4.1). Se usa tanto al alcanzar la optimalidad como cuando ninguna fila
 * participa del criterio de salida (§3.3): en ambos casos indica que la Fase I implícita
 * (sacar las artificiales de la base) terminó con una artificial positiva, o sea, el
 * modelo original es `infactible`.
 */
function tieneArtificialBasicaPositiva(
  base: readonly string[],
  ladoDerecho: readonly Fraccion[],
  columnas: readonly ColumnaTabla[],
): boolean {
  return base.some((nombre, i) => {
    const col = columnas.find((c) => c.id === nombre);
    return col?.tipo === "artificial" && ladoDerecho[i]!.esPositiva();
  });
}

// ---------------------------------------------------------------------------
// §3.1/§3.2 — condición de optimalidad y variable de entrada
// ---------------------------------------------------------------------------

interface SeleccionEntrada {
  indice: number;
  empate: boolean;
}

/**
 * Candidatas = columnas no básicas, excluyendo artificiales que ya salieron de la base
 * (docs/04 §3.1). Devuelve `null` si la tabla ya es óptima (ningún candidato viola la
 * condición de optimalidad).
 */
function elegirEntrada(
  filaZ: ValorM[],
  columnas: ColumnaTabla[],
  base: readonly string[],
  artificialesSalidas: ReadonlySet<string>,
  esMax: boolean,
): SeleccionEntrada | null {
  const basicas = new Set(base);
  const candidatos: number[] = [];
  for (let j = 0; j < columnas.length; j += 1) {
    const col = columnas[j]!;
    if (basicas.has(col.id)) continue;
    if (col.tipo === "artificial" && artificialesSalidas.has(col.id)) continue;
    candidatos.push(j);
  }

  if (candidatos.length === 0) {
    return null;
  }

  let mejor = candidatos[0]!;
  for (const j of candidatos) {
    const cmp = filaZ[j]!.comparar(filaZ[mejor]!);
    if (esMax ? cmp < 0 : cmp > 0) {
      mejor = j;
    }
  }

  const violaOptimalidad = esMax ? filaZ[mejor]!.esNegativo() : esValorMPositivo(filaZ[mejor]!);
  if (!violaOptimalidad) {
    return null;
  }

  const empatados = candidatos.filter((j) => filaZ[j]!.comparar(filaZ[mejor]!) === 0);
  return { indice: Math.min(...empatados), empate: empatados.length > 1 };
}

// ---------------------------------------------------------------------------
// §3.3 — variable de salida (razón mínima)
// ---------------------------------------------------------------------------

type Razon = { valor: Fraccion } | { excluida: "coeficiente_no_positivo" };

interface SeleccionSalida {
  indiceFila: number | null;
  empate: boolean;
  razones: Razon[];
}

function elegirSalida(filas: Fraccion[][], ladoDerecho: Fraccion[], columnaPivote: number): SeleccionSalida {
  const razones: Razon[] = [];
  const candidatos: Array<{ fila: number; razon: Fraccion }> = [];

  for (let i = 0; i < filas.length; i += 1) {
    const coef = filas[i]![columnaPivote]!;
    if (coef.esPositiva()) {
      const razon = ladoDerecho[i]!.dividir(coef);
      razones.push({ valor: razon });
      candidatos.push({ fila: i, razon });
    } else {
      razones.push({ excluida: "coeficiente_no_positivo" });
    }
  }

  if (candidatos.length === 0) {
    return { indiceFila: null, empate: false, razones };
  }

  let mejor = candidatos[0]!;
  for (const c of candidatos) {
    if (c.razon.comparar(mejor.razon) < 0) mejor = c;
  }
  const empatados = candidatos.filter((c) => c.razon.comparar(mejor.razon) === 0);
  return { indiceFila: Math.min(...empatados.map((c) => c.fila)), empate: empatados.length > 1, razones };
}

// ---------------------------------------------------------------------------
// §3.4/§3.5 — elemento pivote y actualización Gauss-Jordan
// ---------------------------------------------------------------------------

interface ResultadoPivote {
  filas: Fraccion[][];
  ladoDerecho: Fraccion[];
  filaZ: ValorM[];
  valorZ: ValorM;
  base: string[];
  operaciones: OperacionFila[];
}

function pivotear(tabla: TablaSimplex, columnaPivote: number, filaPivote: number, entranteId: string): ResultadoPivote {
  const operaciones: OperacionFila[] = [];
  const pivote = tabla.filas[filaPivote]![columnaPivote]!;

  const nuevaFilaPivote = tabla.filas[filaPivote]!.map((c) => c.dividir(pivote));
  const nuevoRhsPivote = tabla.ladoDerecho[filaPivote]!.dividir(pivote);
  operaciones.push({ tipo: "normalizar", fila: entranteId, divisor: pivote });

  const filas: Fraccion[][] = [];
  const ladoDerecho: Fraccion[] = [];
  for (let i = 0; i < tabla.filas.length; i += 1) {
    if (i === filaPivote) {
      filas.push(nuevaFilaPivote);
      ladoDerecho.push(nuevoRhsPivote);
      continue;
    }
    const coef = tabla.filas[i]![columnaPivote]!;
    if (coef.esCero()) {
      filas.push(tabla.filas[i]!);
      ladoDerecho.push(tabla.ladoDerecho[i]!);
      continue;
    }
    operaciones.push({ tipo: "eliminar", fila: tabla.base[i]!, factor: coef, filaOrigen: entranteId });
    filas.push(tabla.filas[i]!.map((valor, j) => valor.restar(coef.multiplicar(nuevaFilaPivote[j]!))));
    ladoDerecho.push(tabla.ladoDerecho[i]!.restar(coef.multiplicar(nuevoRhsPivote)));
  }

  const coefZ = tabla.filaZ[columnaPivote]!;
  let filaZ = tabla.filaZ;
  let valorZ = tabla.valorZ;
  if (!esValorMCero(coefZ)) {
    operaciones.push({ tipo: "eliminar", fila: "Z", factor: coefZ, filaOrigen: entranteId });
    filaZ = tabla.filaZ.map((valor, j) => valor.restar(coefZ.multiplicarPor(nuevaFilaPivote[j]!)));
    valorZ = tabla.valorZ.restar(coefZ.multiplicarPor(nuevoRhsPivote));
  }

  const base = tabla.base.map((id, i) => (i === filaPivote ? entranteId : id));

  return { filas, ladoDerecho, filaZ, valorZ, base, operaciones };
}

// ---------------------------------------------------------------------------
// §4.2 — construcción de la solución a partir de una tabla
// ---------------------------------------------------------------------------

function construirSolucion(
  base: readonly string[],
  ladoDerecho: readonly Fraccion[],
  valorZ: ValorM,
  columnas: readonly ColumnaTabla[],
): Solucion {
  const valores: Record<string, Fraccion> = {};
  for (const col of columnas) {
    valores[col.id] = Fraccion.CERO;
  }
  base.forEach((nombre, i) => {
    valores[nombre] = ladoDerecho[i]!;
  });
  return { valores, z: valorZ.a };
}

/** §4.3: primera columna no básica, no artificial, con costo reducido exactamente 0. */
function buscarColumnaAlternativa(
  filaZ: readonly ValorM[],
  columnas: readonly ColumnaTabla[],
  base: readonly string[],
): number | null {
  const basicas = new Set(base);
  for (let j = 0; j < columnas.length; j += 1) {
    const col = columnas[j]!;
    if (col.tipo === "artificial") continue;
    if (basicas.has(col.id)) continue;
    if (esValorMCero(filaZ[j]!)) return j;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Orquestación principal
// ---------------------------------------------------------------------------

export function resolverSimplex(modelo: ModeloLineal, opciones?: OpcionesSimplex): ResultadoSimplex {
  const maxIteraciones = opciones?.maxIteraciones ?? MAX_ITERACIONES_DEFECTO;
  const esMax = modelo.objetivo.sentido === "max";
  const { preparacion, columnas, tablaInicial } = estandarizar(modelo);

  const tablas: TablaSimplex[] = [];
  const artificialesSalidas = new Set<string>();
  let huboEmpate = false;
  let estado: EstadoSimplex = "optimo";
  let actual = tablaInicial;
  let pivotes = 0;

  for (;;) {
    const entrada = elegirEntrada(actual.filaZ, columnas, actual.base, artificialesSalidas, esMax);

    if (entrada === null) {
      tablas.push(actual);
      estado = "optimo";
      break;
    }
    if (entrada.empate) huboEmpate = true;

    const salida = elegirSalida(actual.filas, actual.ladoDerecho, entrada.indice);
    if (salida.empate) huboEmpate = true;

    if (salida.indiceFila === null) {
      const decision: DecisionIteracion = {
        entra: columnas[entrada.indice]!.id,
        columnaPivote: entrada.indice,
        razones: salida.razones,
        empateEntrada: entrada.empate,
        empateSalida: false,
        operaciones: [],
      };
      tablas.push({ ...actual, decision });
      // Ninguna fila participó de la razón mínima: si no hay una artificial básica
      // positiva, el modelo no tiene cota (no_acotado, docs/04 §3.3); si la hay, la
      // Fase I implícita ya terminó con esa artificial > 0 y el modelo es infactible
      // (docs/04 §4.1), nunca no_acotado (bug corregido: antes se reportaba siempre
      // no_acotado sin este chequeo).
      estado = tieneArtificialBasicaPositiva(actual.base, actual.ladoDerecho, columnas)
        ? "infactible"
        : "no_acotado";
      break;
    }

    if (pivotes >= maxIteraciones) {
      // Se alcanzó el límite de iteraciones antes de ejecutar el pivoteo: se registra
      // qué columna hubiera entrado (para diagnóstico), pero `sale`/`filaPivote`/
      // `elementoPivote` quedan ausentes porque ese pivoteo nunca se ejecutó — evita que
      // la UI muestre un pivoteo "fantasma" que no ocurrió.
      const decision: DecisionIteracion = {
        entra: columnas[entrada.indice]!.id,
        columnaPivote: entrada.indice,
        razones: salida.razones,
        empateEntrada: entrada.empate,
        empateSalida: salida.empate,
        operaciones: [],
      };
      tablas.push({ ...actual, decision });
      estado = "limite_iteraciones";
      break;
    }

    const saliente = actual.base[salida.indiceFila]!;
    const pivote = pivotear(actual, entrada.indice, salida.indiceFila, columnas[entrada.indice]!.id);

    const decision: DecisionIteracion = {
      entra: columnas[entrada.indice]!.id,
      columnaPivote: entrada.indice,
      razones: salida.razones,
      sale: saliente,
      filaPivote: salida.indiceFila,
      elementoPivote: actual.filas[salida.indiceFila]![entrada.indice]!,
      empateEntrada: entrada.empate,
      empateSalida: salida.empate,
      operaciones: pivote.operaciones,
    };
    tablas.push({ ...actual, decision });

    // No depender de la convención de nombres ("A..."): usar el tipo real de columna.
    const columnaSaliente = columnas.find((c) => c.id === saliente);
    if (columnaSaliente?.tipo === "artificial") {
      artificialesSalidas.add(saliente);
    }

    actual = {
      indice: actual.indice + 1,
      base: pivote.base,
      filas: pivote.filas,
      ladoDerecho: pivote.ladoDerecho,
      filaZ: pivote.filaZ,
      valorZ: pivote.valorZ,
    };
    pivotes += 1;
  }

  let solucion: Solucion | undefined;
  let solucionAlternativa: Solucion | undefined;
  let alternativa: ResultadoSimplex["alternativa"];

  if (estado === "optimo") {
    const tablaFinal = tablas[tablas.length - 1]!;
    const esArtificialInfactible = tieneArtificialBasicaPositiva(tablaFinal.base, tablaFinal.ladoDerecho, columnas);

    if (esArtificialInfactible) {
      estado = "infactible";
    } else {
      solucion = construirSolucion(tablaFinal.base, tablaFinal.ladoDerecho, tablaFinal.valorZ, columnas);

      const columnaAlternativa = buscarColumnaAlternativa(tablaFinal.filaZ, columnas, tablaFinal.base);
      if (columnaAlternativa !== null) {
        estado = "optimos_alternativos";
        const entranteAlternativo = columnas[columnaAlternativa]!.id;
        const salidaAlternativa = elegirSalida(tablaFinal.filas, tablaFinal.ladoDerecho, columnaAlternativa);
        if (salidaAlternativa.indiceFila !== null) {
          const pivoteAlternativo = pivotear(
            tablaFinal,
            columnaAlternativa,
            salidaAlternativa.indiceFila,
            entranteAlternativo,
          );
          solucionAlternativa = construirSolucion(
            pivoteAlternativo.base,
            pivoteAlternativo.ladoDerecho,
            pivoteAlternativo.valorZ,
            columnas,
          );

          // Registrar el pivoteo extra paso a paso (decisión + tabla resultante), no
          // solo el resultado final: la UI necesita mostrarlo en "Ver solución alternativa".
          const decisionAlternativa: DecisionIteracion = {
            entra: entranteAlternativo,
            columnaPivote: columnaAlternativa,
            razones: salidaAlternativa.razones,
            sale: tablaFinal.base[salidaAlternativa.indiceFila]!,
            filaPivote: salidaAlternativa.indiceFila,
            elementoPivote: tablaFinal.filas[salidaAlternativa.indiceFila]![columnaAlternativa]!,
            empateEntrada: false,
            empateSalida: salidaAlternativa.empate,
            operaciones: pivoteAlternativo.operaciones,
          };
          alternativa = {
            decision: decisionAlternativa,
            tabla: {
              indice: tablaFinal.indice + 1,
              base: pivoteAlternativo.base,
              filas: pivoteAlternativo.filas,
              ladoDerecho: pivoteAlternativo.ladoDerecho,
              filaZ: pivoteAlternativo.filaZ,
              valorZ: pivoteAlternativo.valorZ,
            },
          };
        }
        if (salidaAlternativa.empate) huboEmpate = true;
      }
    }
  }

  const avisos = construirAvisos({
    modelo,
    columnas,
    solucion,
    tablaFinal: tablas[tablas.length - 1],
    huboEmpate,
    limiteIteraciones: estado === "limite_iteraciones",
  });

  return { estado, preparacion, columnas, tablas, solucion, solucionAlternativa, alternativa, avisos };
}

// ---------------------------------------------------------------------------
// §4.4 — avisos
// ---------------------------------------------------------------------------

function construirAvisos(args: {
  modelo: ModeloLineal;
  columnas: readonly ColumnaTabla[];
  solucion: Solucion | undefined;
  tablaFinal: TablaSimplex | undefined;
  huboEmpate: boolean;
  limiteIteraciones: boolean;
}): Aviso[] {
  const avisos: Aviso[] = [];

  const noEntera =
    args.modelo.naturaleza === "entera" &&
    args.solucion !== undefined &&
    args.columnas.some(
      (col) => col.tipo === "decision" && !args.solucion!.valores[col.id]!.esEntera(),
    );
  if (noEntera) {
    avisos.push({ codigo: "no_entera", mensaje: TEXTO_AVISO.no_entera! });
  }

  const degenerada =
    args.solucion !== undefined &&
    args.tablaFinal !== undefined &&
    args.tablaFinal.ladoDerecho.some((r) => r.esCero());
  if (degenerada) {
    avisos.push({ codigo: "degenerada", mensaje: TEXTO_AVISO.degenerada! });
  }

  if (args.huboEmpate) {
    avisos.push({ codigo: "empate", mensaje: TEXTO_AVISO.empate! });
  }

  const objetivoCero = args.modelo.objetivo.coeficientes.every((c) => parsearFraccion(c).esCero());
  if (objetivoCero) {
    avisos.push({ codigo: "objetivo_cero", mensaje: TEXTO_AVISO.objetivo_cero! });
  }

  if (args.limiteIteraciones) {
    avisos.push({ codigo: "posible_ciclo", mensaje: TEXTO_AVISO.posible_ciclo! });
  }

  return avisos;
}

// ---------------------------------------------------------------------------
// §3.5 — detalle celda por celda, para el panel "Ver cálculo celda a celda"
// ---------------------------------------------------------------------------

export function detalleCeldas(
  tablaAnterior: TablaSimplex,
  decision: DecisionIteracion,
): Array<Array<DetalleCelda<Fraccion | ValorM>>> {
  if (decision.filaPivote === undefined || decision.elementoPivote === undefined) {
    return [];
  }
  const { filaPivote, elementoPivote: pivote, columnaPivote } = decision;

  const nuevaFilaPivoteCompleta: Fraccion[] = [
    ...tablaAnterior.filas[filaPivote]!.map((c) => c.dividir(pivote)),
    tablaAnterior.ladoDerecho[filaPivote]!.dividir(pivote),
  ];

  const filas: Array<Array<DetalleCelda<Fraccion | ValorM>>> = [];

  for (let i = 0; i < tablaAnterior.filas.length; i += 1) {
    const filaCompleta: Fraccion[] = [...tablaAnterior.filas[i]!, tablaAnterior.ladoDerecho[i]!];

    if (i === filaPivote) {
      filas.push(
        filaCompleta.map((actual, j) => ({
          actual,
          factor: pivote,
          nuevoPivote: nuevaFilaPivoteCompleta[j]!,
          resultado: nuevaFilaPivoteCompleta[j]!,
        })),
      );
      continue;
    }

    const factor = filaCompleta[columnaPivote]!;
    filas.push(
      filaCompleta.map((actual, j) => ({
        actual,
        factor,
        nuevoPivote: nuevaFilaPivoteCompleta[j]!,
        resultado: actual.restar(factor.multiplicar(nuevaFilaPivoteCompleta[j]!)),
      })),
    );
  }

  const filaZCompleta: ValorM[] = [...tablaAnterior.filaZ, tablaAnterior.valorZ];
  const factorZ = tablaAnterior.filaZ[columnaPivote]!;
  filas.push(
    filaZCompleta.map((actual, j) => ({
      actual,
      factor: factorZ,
      nuevoPivote: nuevaFilaPivoteCompleta[j]!,
      resultado: actual.restar(factorZ.multiplicarPor(nuevaFilaPivoteCompleta[j]!)),
    })),
  );

  return filas;
}
