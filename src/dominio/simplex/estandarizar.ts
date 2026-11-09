/**
 * Preparación de la tabla inicial del Simplex (`dominio/simplex/estandarizar.ts`),
 * docs/04-motor-simplex.md §2 completo (pasos 1-4 de la clase, incluido el ajuste de M
 * de §2.5): normaliza lados derechos negativos, agrega holguras/exceso/artificiales,
 * arma la fila Z canónica y elimina M de las columnas básicas para producir `tablas[0]`.
 */

import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import { ValorM } from "../aritmetica/valor-m";
import type { ModeloLineal, Relacion } from "../modelo/tipos";
import type { ColumnaTabla, OperacionFila, PasoPreparacion, TablaSimplex } from "./tipos";

export interface ResultadoEstandarizacion {
  preparacion: PasoPreparacion[];
  columnas: ColumnaTabla[];
  /** `tablas[0]`: tabla inicial ya ajustada (sin M en las columnas básicas). */
  tablaInicial: TablaSimplex;
}

interface RestriccionNormalizada {
  numero: number;
  coeficientes: Fraccion[];
  relacion: Relacion;
  limite: Fraccion;
}

/** `≤ ↔ ≥`; `=` se queda (docs/04 §2.1). */
function invertirRelacion(relacion: Relacion): Relacion {
  if (relacion === "<=") return ">=";
  if (relacion === ">=") return "<=";
  return "=";
}

function esValorMCero(v: ValorM): boolean {
  return v.a.esCero() && v.b.esCero();
}

/** §2.1: normaliza los lados derechos negativos, registrando el paso si corresponde. */
function normalizarLimites(
  modelo: ModeloLineal,
  preparacion: PasoPreparacion[],
): RestriccionNormalizada[] {
  return modelo.restricciones.map((r) => {
    const coeficientes = r.coeficientes.map((c) => parsearFraccion(c));
    const limite = parsearFraccion(r.limite);

    if (!limite.esNegativa()) {
      return { numero: r.numero, coeficientes, relacion: r.relacion, limite };
    }

    const coeficientesNormalizados = coeficientes.map((c) => c.negar());
    const limiteNormalizado = limite.negar();
    const relacionNormalizada = invertirRelacion(r.relacion);

    preparacion.push({
      tipo: "normalizar_limite",
      restriccionNumero: r.numero,
      relacionOriginal: r.relacion,
      coeficientesOriginales: coeficientes,
      limiteOriginal: limite,
      relacionNormalizada,
      coeficientesNormalizados,
      limiteNormalizado,
    });

    return {
      numero: r.numero,
      coeficientes: coeficientesNormalizados,
      relacion: relacionNormalizada,
      limite: limiteNormalizado,
    };
  });
}

/** §2.2/§2.3: agrega S/A por restricción y devuelve columnas (en orden) + básica inicial por fila. */
function agregarVariables(
  normalizadas: RestriccionNormalizada[],
  preparacion: PasoPreparacion[],
): { columnas: ColumnaTabla[]; base: string[] } {
  const columnasS: ColumnaTabla[] = [];
  const columnasA: ColumnaTabla[] = [];
  const base: string[] = [];

  for (const r of normalizadas) {
    let variables: ColumnaTabla[];
    let basicaInicial: string;

    if (r.relacion === "<=") {
      const s: ColumnaTabla = { id: `S${r.numero}`, tipo: "holgura", restriccion: r.numero };
      columnasS.push(s);
      variables = [s];
      basicaInicial = s.id;
    } else if (r.relacion === ">=") {
      const s: ColumnaTabla = { id: `S${r.numero}`, tipo: "exceso", restriccion: r.numero };
      const a: ColumnaTabla = { id: `A${r.numero}`, tipo: "artificial", restriccion: r.numero };
      columnasS.push(s);
      columnasA.push(a);
      variables = [s, a];
      basicaInicial = a.id;
    } else {
      const a: ColumnaTabla = { id: `A${r.numero}`, tipo: "artificial", restriccion: r.numero };
      columnasA.push(a);
      variables = [a];
      basicaInicial = a.id;
    }

    base.push(basicaInicial);
    preparacion.push({
      tipo: "agregar_variables",
      restriccionNumero: r.numero,
      relacion: r.relacion,
      variables,
      basicaInicial,
    });
  }

  return { columnas: [...columnasS, ...columnasA], base };
}

export function estandarizar(modelo: ModeloLineal): ResultadoEstandarizacion {
  const preparacion: PasoPreparacion[] = [];
  const numVariables = modelo.variables.length;

  const normalizadas = normalizarLimites(modelo, preparacion);

  const columnasDecision: ColumnaTabla[] = modelo.variables.map((v) => ({
    id: v.nombre,
    tipo: "decision",
  }));
  const { columnas: columnasHolguraArtificial, base } = agregarVariables(normalizadas, preparacion);
  const columnas: ColumnaTabla[] = [...columnasDecision, ...columnasHolguraArtificial];
  const indiceColumna = new Map(columnas.map((c, i) => [c.id, i]));

  // Forma estándar completa: todas las columnas, con 0 donde la variable no aparece.
  const filas: Fraccion[][] = normalizadas.map((r) => {
    const fila = columnas.map(() => Fraccion.CERO);
    for (let j = 0; j < numVariables; j += 1) {
      // r.coeficientes tiene longitud == numVariables (validado por esquemaModelo).
      fila[j] = r.coeficientes[j]!;
    }
    if (r.relacion === "<=") {
      fila[indiceColumna.get(`S${r.numero}`)!] = Fraccion.UNO;
    } else if (r.relacion === ">=") {
      fila[indiceColumna.get(`S${r.numero}`)!] = Fraccion.de(-1);
      fila[indiceColumna.get(`A${r.numero}`)!] = Fraccion.UNO;
    } else {
      fila[indiceColumna.get(`A${r.numero}`)!] = Fraccion.UNO;
    }
    return fila;
  });
  const ladoDerecho = normalizadas.map((r) => r.limite);

  // §2.4: fila Z canónica (z - Σcⱼxⱼ ∓ M·Aᵢ = 0).
  const esMax = modelo.objetivo.sentido === "max";
  const coefObjetivo = modelo.objetivo.coeficientes.map((c) => parsearFraccion(c));
  const filaZCanonica: ValorM[] = columnas.map((col) => {
    if (col.tipo === "decision") {
      const j = modelo.variables.findIndex((v) => v.nombre === col.id);
      // j siempre existe: col.id viene de modelo.variables.map(...) más arriba.
      return new ValorM(coefObjetivo[j]!.negar());
    }
    if (col.tipo === "artificial") {
      return new ValorM(Fraccion.CERO, esMax ? Fraccion.UNO : Fraccion.de(-1));
    }
    // holgura / exceso
    return new ValorM(Fraccion.CERO);
  });
  const valorZCanonico = new ValorM(Fraccion.CERO);

  // §2.2 (diapositiva 8) / docs/06 "Preparación ▸ 2 Forma estándar": sistema completo
  // (todas las variables en cada ecuación) con el objetivo todavía en la forma
  // `Z = Σcⱼxⱼ + 0·Sᵢ ∓ M·Aᵢ` (negación de la fila Z canónica, antes de pasar a `z - ... = 0`).
  preparacion.push({
    tipo: "forma_estandar",
    filas,
    ladoDerecho,
    objetivo: filaZCanonica.map((v) => v.negar()),
    variables: columnas.map((c) => c.id),
  });

  preparacion.push({ tipo: "fila_z_canonica", filaZ: filaZCanonica });

  // §2.5: ajuste de M — eliminar M de las columnas con artificial básica.
  const operacionesAjuste: OperacionFila[] = [];
  let filaZ = filaZCanonica;
  let valorZ = valorZCanonico;

  base.forEach((nombreBasica, i) => {
    const columnaBasica = columnas[indiceColumna.get(nombreBasica)!]!;
    if (columnaBasica.tipo !== "artificial") {
      return;
    }
    const coefEnZ = filaZ[indiceColumna.get(nombreBasica)!]!;
    if (esValorMCero(coefEnZ)) {
      return;
    }
    operacionesAjuste.push({ tipo: "eliminar", fila: "Z", factor: coefEnZ, filaOrigen: nombreBasica });
    const filaI = filas[i]!;
    filaZ = filaZ.map((valor, j) => valor.restar(coefEnZ.multiplicarPor(filaI[j]!)));
    valorZ = valorZ.restar(coefEnZ.multiplicarPor(ladoDerecho[i]!));
  });

  preparacion.push({
    tipo: "ajuste_m",
    filaZAntes: filaZCanonica,
    filaZDespues: filaZ,
    operaciones: operacionesAjuste,
  });

  const tablaInicial: TablaSimplex = {
    indice: 0,
    base,
    filas,
    ladoDerecho,
    filaZ,
    valorZ,
  };

  return { preparacion, columnas, tablaInicial };
}
