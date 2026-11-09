/**
 * Coherencia entre el método gráfico y el Simplex (docs/05-metodo-grafico.md §3).
 *
 * Para cada caso de 2 variables de `__fixtures__/casos.ts` se resuelve el mismo modelo con
 * ambos motores y se verifica:
 *  1. El estado coincide, agrupando `optimo` y `optimos_alternativos` como "con solución".
 *  2. El valor de Z coincide exactamente (`Fraccion`, sin `number`).
 *  3. Si el óptimo es único en ambos, el punto (x1, x2) coincide exactamente. Además, todo
 *     vértice que el Simplex reporta como óptimo (principal y alternativo) debe ser un vértice
 *     óptimo del gráfico.
 */

import { describe, expect, it } from "vitest";
import type { Fraccion } from "./aritmetica/fraccion";
import { CASOS } from "./__fixtures__/casos";
import { resolverGrafico } from "./grafico/resolver";
import type { EstadoGrafico, Punto, ResultadoGrafico } from "./grafico/tipos";
import { resolverSimplex } from "./simplex/resolver";
import type { EstadoSimplex, ResultadoSimplex, Solucion } from "./simplex/tipos";

const CASOS_DOS_VARIABLES = CASOS.filter((caso) => caso.modelo.variables.length === 2);

type EstadoMetodo = EstadoSimplex | EstadoGrafico;

/** `optimo` y `optimos_alternativos` son "tiene solución" a efectos de esta comparación (docs/05 §3). */
function estadoAgrupado(estado: EstadoMetodo): string {
  return estado === "optimo" || estado === "optimos_alternativos" ? "con_solucion" : estado;
}

function tieneSolucion(estado: EstadoMetodo): boolean {
  return estadoAgrupado(estado) === "con_solucion";
}

function valorVariable(solucion: Solucion, nombre: string): Fraccion {
  const valor = solucion.valores[nombre];
  if (valor === undefined) {
    throw new Error(`La solución del Simplex no tiene la variable ${nombre}`);
  }
  return valor;
}

function puntoDeSolucion(solucion: Solucion): Punto {
  return { x1: valorVariable(solucion, "x1"), x2: valorVariable(solucion, "x2") };
}

function solucionSimplex(resultado: ResultadoSimplex): Solucion {
  if (resultado.solucion === undefined) {
    throw new Error(`El Simplex reporta "${resultado.estado}" y no entrega solución`);
  }
  return resultado.solucion;
}

function optimoGrafico(resultado: ResultadoGrafico): { punto: Punto; z: Fraccion } {
  if (resultado.optimo === undefined) {
    throw new Error(`El gráfico reporta "${resultado.estado}" y no entrega óptimo`);
  }
  return resultado.optimo;
}

function aTextoPunto(punto: Punto): string {
  return `(${punto.x1.aTexto()}, ${punto.x2.aTexto()})`;
}

function mismoPunto(a: Punto, b: Punto): boolean {
  return a.x1.igual(b.x1) && a.x2.igual(b.x2);
}

describe("Coherencia gráfico ↔ Simplex · cobertura", () => {
  it("usa exactamente los casos de 2 variables de las fixtures", () => {
    expect(CASOS_DOS_VARIABLES.map((caso) => caso.id)).toEqual([
      "C1",
      "C2",
      "C2-E",
      "C3",
      "C4",
      "C5",
      "C6",
      "C7",
      "C8",
      "C9",
      "C12",
    ]);
  });
});

describe.each(CASOS_DOS_VARIABLES)("Coherencia gráfico ↔ Simplex · $id", (caso) => {
  const simplex = resolverSimplex(caso.modelo);
  const grafico = resolverGrafico(caso.modelo);
  const ambosConSolucion = tieneSolucion(simplex.estado) && tieneSolucion(grafico.estado);

  it("el estado coincide (optimo y optimos_alternativos agrupados)", () => {
    expect(
      estadoAgrupado(grafico.estado),
      `gráfico=${grafico.estado} vs simplex=${simplex.estado}`,
    ).toBe(estadoAgrupado(simplex.estado));
  });

  it.runIf(ambosConSolucion)("el valor de Z coincide exactamente", () => {
    const zSimplex = solucionSimplex(simplex).z.aTexto();
    const zGrafico = optimoGrafico(grafico).z.aTexto();
    expect(zGrafico).toBe(zSimplex);
  });

  it.runIf(ambosConSolucion)("cada óptimo que reporta el Simplex es un vértice óptimo del gráfico", () => {
    const optimosSimplex = [solucionSimplex(simplex)];
    if (simplex.solucionAlternativa !== undefined) {
      optimosSimplex.push(simplex.solucionAlternativa);
    }
    const verticesOptimosGrafico = grafico.vertices.filter((v) => v.esOptimo);

    for (const solucion of optimosSimplex) {
      const punto = puntoDeSolucion(solucion);
      const hallado = verticesOptimosGrafico.some((v) => mismoPunto(v.punto, punto));
      expect(hallado, `el punto ${aTextoPunto(punto)} del Simplex no es óptimo en el gráfico`).toBe(true);
    }
  });

  it.runIf(ambosConSolucion && simplex.estado === "optimo" && grafico.estado === "optimo")(
    "con óptimo único, el punto (x1, x2) coincide exactamente",
    () => {
      const puntoSimplex = puntoDeSolucion(solucionSimplex(simplex));
      const puntoGrafico = optimoGrafico(grafico).punto;
      expect(aTextoPunto(puntoGrafico)).toBe(aTextoPunto(puntoSimplex));
    },
  );
});
