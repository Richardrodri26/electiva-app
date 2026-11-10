import { describe, expect, it } from "vitest";

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import { resolverGrafico } from "@/dominio/grafico/resolver";
import type { Vertice } from "@/dominio/grafico/tipos";
import { C1 } from "@/dominio/__fixtures__/casos";

import {
  calcularEnvolvente,
  calcularFlechaMejora,
  calcularNivelMaximo,
  calcularSegmentoLinea,
  puntoANumero,
  puntoMedio,
} from "./geometria";

describe("puntoANumero", () => {
  it("convierte un punto exacto a number", () => {
    const resultado = resolverGrafico(C1.modelo);
    const optimo = resultado.optimo!.punto;
    expect(puntoANumero(optimo)).toEqual({ x1: 31 / 4, x2: 21 / 8 });
  });
});

describe("calcularEnvolvente", () => {
  it("devuelve [] con menos de 3 vértices (punto o segmento, se dibujan distinto)", () => {
    expect(calcularEnvolvente([])).toEqual([]);
  });

  it("reproduce exactamente el cuadrilátero de C1 (docs/08-casos-de-prueba.md)", () => {
    // C1: (0,0) z=0 · (6,0) z=18 · (31/4,21/8) z=57/2 · (0,13/2) z=13 — orden angular
    // antihorario ya garantizado por `resolverGrafico` (docs/05 §2.7).
    const resultado = resolverGrafico(C1.modelo);
    expect(resultado.estado).toBe("optimo");
    expect(resultado.vertices).toHaveLength(4);

    const envolvente = calcularEnvolvente(resultado.vertices);
    const porX1 = new Map(envolvente.map((p) => [p.x1, p]));

    // Lado izquierdo vertical (eje x2, x1 = 0): de (0,0) a (0, 6.5).
    expect(porX1.get(0)).toEqual({ x1: 0, inferior: 0, superior: 6.5 });

    // Lado inferior horizontal (eje x1, x2 = 0): borde inferior sigue en 0 hasta x1 = 6.
    expect(porX1.get(6)?.inferior).toBe(0);
    // Borde superior en x1 = 6 cae sobre la recta 2x1 + 4x2 = 26 (R3): x2 = (26 - 12) / 4 = 3.5.
    expect(porX1.get(6)?.superior).toBeCloseTo(3.5, 10);

    // El quiebre del óptimo (31/4 = 7.75) es el vértice más a la derecha: ahí el borde
    // inferior y el superior coinciden (es un solo punto, el final del polígono por ese lado).
    const puntoOptimo = porX1.get(7.75);
    expect(puntoOptimo?.inferior).toBeCloseTo(2.625, 10);
    expect(puntoOptimo?.superior).toBeCloseTo(2.625, 10);
  });

  it("en un triángulo simple, la envolvente coincide con los tres lados", () => {
    // Triángulo (0,0)-(4,0)-(0,4): hipotenusa x1 + x2 = 4.
    const triangulo: Vertice[] = [
      verticeDePrueba("A", 0, 0),
      verticeDePrueba("B", 4, 0),
      verticeDePrueba("C", 0, 4),
    ];

    const envolvente = calcularEnvolvente(triangulo);
    const porX1 = new Map(envolvente.map((p) => [p.x1, p]));

    expect(porX1.get(0)).toEqual({ x1: 0, inferior: 0, superior: 4 });
    expect(porX1.get(4)).toEqual({ x1: 4, inferior: 0, superior: 0 });
  });
});

describe("calcularSegmentoLinea", () => {
  it("recorta una recta no vertical a los bordes del dominio x1", () => {
    // 2x1 + 4x2 = 26 (R3 de C1), dominio x1 en [0, 10].
    const segmento = calcularSegmentoLinea(2, 4, 26, [0, 10], [0, 20]);
    expect(segmento).toEqual({
      desde: { x1: 0, x2: 6.5 },
      hasta: { x1: 10, x2: 1.5 },
    });
  });

  it("una recta vertical (a2 = 0) usa los bordes del dominio x2", () => {
    const segmento = calcularSegmentoLinea(1, 0, 3, [0, 10], [0, 8]);
    expect(segmento).toEqual({
      desde: { x1: 3, x2: 0 },
      hasta: { x1: 3, x2: 8 },
    });
  });

  it("recorta también por x2: la recta no baja del dominio visible", () => {
    // x1 + 2x2 = 10 en [0, 12] x [0, 12]: sale del dominio en (10, 0).
    const segmento = calcularSegmentoLinea(1, 2, 10, [0, 12], [0, 12]);
    expect(segmento).toEqual({
      desde: { x1: 0, x2: 5 },
      hasta: { x1: 10, x2: 0 },
    });
  });

  it("una recta horizontal (a1 = 0) se recorta a los bordes de x1", () => {
    const segmento = calcularSegmentoLinea(0, 2, 6, [0, 10], [0, 10]);
    expect(segmento).toEqual({
      desde: { x1: 0, x2: 3 },
      hasta: { x1: 10, x2: 3 },
    });
  });

  it("una recta que solo toca el origen (nivel Z = 0) queda como punto", () => {
    const segmento = calcularSegmentoLinea(3, 5, 0, [0, 12], [0, 12]);
    expect(segmento?.desde).toEqual({ x1: 0, x2: 0 });
    expect(segmento?.hasta).toEqual({ x1: 0, x2: 0 });
  });

  it("devuelve null si la recta no cruza el dominio", () => {
    expect(calcularSegmentoLinea(1, 1, -5, [0, 10], [0, 10])).toBeNull();
  });

  it("devuelve null para una recta degenerada (a1 = a2 = 0)", () => {
    expect(calcularSegmentoLinea(0, 0, 5, [0, 10], [0, 10])).toBeNull();
  });
});

describe("calcularFlechaMejora", () => {
  it("apunta en la dirección (c1, c2) al maximizar", () => {
    const flecha = calcularFlechaMejora(3, 4, "max", { x1: 1, x2: 1 }, 5);
    // (3,4) normalizado es (0.6, 0.8); escalado a longitud 5 da (3, 4).
    expect(flecha).toEqual({ desde: { x1: 1, x2: 1 }, hasta: { x1: 4, x2: 5 } });
  });

  it("apunta en la dirección opuesta al minimizar", () => {
    const flecha = calcularFlechaMejora(3, 4, "min", { x1: 1, x2: 1 }, 5);
    expect(flecha).toEqual({ desde: { x1: 1, x2: 1 }, hasta: { x1: -2, x2: -3 } });
  });

  it("devuelve null con objetivo degenerado (c1 = c2 = 0)", () => {
    expect(calcularFlechaMejora(0, 0, "max", { x1: 0, x2: 0 }, 5)).toBeNull();
  });
});

describe("calcularNivelMaximo", () => {
  it("usa Z del óptimo cuando existe", () => {
    expect(calcularNivelMaximo(3, 2, 28.5, [0, 10], [0, 10])).toBe(28.5);
  });

  it("usa Z en la esquina más lejana del dominio cuando no hay óptimo finito (no acotado)", () => {
    expect(calcularNivelMaximo(3, 2, undefined, [0, 10], [0, 8])).toBe(3 * 10 + 2 * 8);
  });
});

describe("puntoMedio", () => {
  it("calcula el punto medio de un segmento", () => {
    expect(puntoMedio({ desde: { x1: 0, x2: 0 }, hasta: { x1: 4, x2: 2 } })).toEqual({
      x1: 2,
      x2: 1,
    });
  });
});

/** `Vertice` mínimo para los tests de geometría pura: solo `punto` importa acá. */
function verticeDePrueba(id: string, x1: number, x2: number): Vertice {
  return {
    id,
    punto: { x1: Fraccion.de(x1), x2: Fraccion.de(x2) },
    z: Fraccion.CERO,
    restriccionesActivas: [],
    esOptimo: false,
  };
}
