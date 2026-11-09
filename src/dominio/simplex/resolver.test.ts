import { describe, expect, it } from "vitest";
import { Fraccion } from "../aritmetica/fraccion";
import {
  C1,
  C2,
  C2_E,
  C5,
  C7,
  C8,
  C11,
  C12,
  CASOS,
  type CasoPrueba,
} from "../__fixtures__/casos";
import type { ModeloLineal } from "../modelo/tipos";
import { detalleCeldas, resolverSimplex } from "./resolver";
import type { ColumnaTabla, Solucion, TablaSimplex } from "./tipos";

/** Traza `{entra, sale, pivote}[]` reconstruida a partir de las tablas del resultado. */
function trazaDe(tablas: TablaSimplex[]): Array<{ entra: string; sale: string | null; pivote: string | null }> {
  return tablas
    .filter((t) => t.decision !== undefined)
    .map((t) => ({
      entra: t.decision!.entra,
      sale: t.decision!.sale ?? null,
      pivote: t.decision!.elementoPivote?.aTexto() ?? null,
    }));
}

/** Verifica que `solucion` tenga exactamente los valores no-cero listados en el fixture. */
function esperarSolucion(solucion: Solucion | undefined, esperado: Record<string, string>, columnas: ColumnaTabla[]): void {
  expect(solucion).toBeDefined();
  for (const [id, valor] of Object.entries(esperado)) {
    expect(solucion!.valores[id]?.aTexto()).toBe(valor);
  }
  for (const col of columnas) {
    if (!(col.id in esperado)) {
      expect(solucion!.valores[col.id]!.esCero()).toBe(true);
    }
  }
}

describe("resolverSimplex — oráculo docs/08-casos-de-prueba.md", () => {
  it.each(CASOS.map((c) => [c.id, c] as const))("%s", (_id, caso: CasoPrueba) => {
    const resultado = resolverSimplex(caso.modelo);

    expect(resultado.estado).toBe(caso.simplex.estado);
    expect(trazaDe(resultado.tablas)).toEqual(caso.simplex.traza);

    if (caso.simplex.solucion) {
      esperarSolucion(resultado.solucion, caso.simplex.solucion, resultado.columnas);
      expect(resultado.solucion!.z.aTexto()).toBe(caso.simplex.z);
    } else {
      expect(resultado.solucion).toBeUndefined();
    }

    // Comparación estricta (no `arrayContaining`): detecta tanto avisos de más que el
    // código emite y el fixture no declara, como avisos de menos.
    expect(resultado.avisos.map((a) => a.codigo)).toEqual(caso.simplex.avisos ?? []);

    if (caso.simplex.alternativa) {
      esperarSolucion(resultado.solucionAlternativa, caso.simplex.alternativa.solucion, resultado.columnas);
      expect(resultado.solucionAlternativa!.z.aTexto()).toBe(caso.simplex.alternativa.z);

      // El pivoteo extra que produce la solución alternativa también debe quedar
      // registrado paso a paso (entra/sale/pivote), no solo el resultado final.
      expect(resultado.alternativa).toBeDefined();
      const decisionAlternativa = resultado.alternativa!.decision;
      expect(caso.simplex.alternativa.traza).toEqual([
        {
          entra: decisionAlternativa.entra,
          sale: decisionAlternativa.sale ?? null,
          pivote: decisionAlternativa.elementoPivote?.aTexto() ?? null,
        },
      ]);
    }
  });
});

describe("resolverSimplex — C1: tabla completa tras la iteración 1", () => {
  it("coincide con la diapositiva 27 (docs/08)", () => {
    const resultado = resolverSimplex(C1.modelo);
    const tabla1 = resultado.tablas[1]!;
    const fixture = C1.tablaTrasIteracion1!;
    const filasRestriccion = fixture.filas.filter((f) => f.fila !== "Z");

    expect(tabla1.base).toEqual(filasRestriccion.map((f) => f.fila));
    filasRestriccion.forEach((f, i) => {
      expect(tabla1.filas[i]!.map((c) => c.aTexto())).toEqual(f.coeficientes);
      expect(tabla1.ladoDerecho[i]!.aTexto()).toBe(f.rhs);
    });

    // La fila "Z" del fixture es la fila Z de la misma tabla.
    const filaZFixture = fixture.filas.find((f) => f.fila === "Z")!;
    expect(tabla1.filaZ.map((v) => v.aTexto())).toEqual(filaZFixture.coeficientes);
    expect(tabla1.valorZ.aTexto()).toBe(filaZFixture.rhs);

    // Razones de la decisión de la iteración 2 (registrada en tabla1.decision).
    const razonesEsperadas = fixture.razones;
    const razonesActuales = tabla1.decision!.razones;
    razonesEsperadas.forEach((r, i) => {
      const actual = razonesActuales[i]!;
      if (r.valor === "excluida") {
        expect(actual).toEqual({ excluida: "coeficiente_no_positivo" });
      } else {
        expect("valor" in actual && actual.valor.aTexto()).toBe(r.valor);
      }
    });
  });
});

describe("resolverSimplex — casos límite", () => {
  it("C7 (infactible): A2 queda básica con valor 3 y no hay solución", () => {
    const resultado = resolverSimplex(C7.modelo);
    expect(resultado.estado).toBe("infactible");
    expect(resultado.solucion).toBeUndefined();
    const tablaFinal = resultado.tablas[resultado.tablas.length - 1]!;
    const idxA2 = tablaFinal.base.indexOf("A2");
    expect(idxA2).toBeGreaterThanOrEqual(0);
    expect(tablaFinal.ladoDerecho[idxA2]!.aTexto()).toBe("3");
  });

  it("C8 (no acotado): la segunda decisión no tiene fila de salida", () => {
    const resultado = resolverSimplex(C8.modelo);
    expect(resultado.estado).toBe("no_acotado");
    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    expect(ultima.decision!.sale).toBeUndefined();
    expect(ultima.decision!.filaPivote).toBeUndefined();
    expect(ultima.decision!.razones.every((r) => "excluida" in r)).toBe(true);
  });

  it("C2-E: misma solución que C2 más el aviso no_entera", () => {
    const resultado = resolverSimplex(C2_E.modelo);
    expect(resultado.estado).toBe("optimo");
    expect(resultado.avisos.some((a) => a.codigo === "no_entera")).toBe(true);
    expect(resultado.solucion!.valores.x1!.aTexto()).toBe("8/3");
    expect(resultado.solucion!.valores.x2!.aTexto()).toBe("8/3");
  });

  it("C12: hubo empate de entrada (x1 vs x2, ambos -1-M) y se eligió x1", () => {
    const resultado = resolverSimplex(C12.modelo);
    const primeraDecision = resultado.tablas[0]!.decision!;
    expect(primeraDecision.entra).toBe("x1");
    expect(primeraDecision.empateEntrada).toBe(true);
    expect(resultado.avisos.some((a) => a.codigo === "empate")).toBe(true);
  });

  it("límite de iteraciones: con maxIteraciones=0 reporta limite_iteraciones y aviso posible_ciclo", () => {
    const resultado = resolverSimplex(C1.modelo, { maxIteraciones: 0 });
    expect(resultado.estado).toBe("limite_iteraciones");
    expect(resultado.avisos.some((a) => a.codigo === "posible_ciclo")).toBe(true);

    // Decisión "fantasma" (hallazgo #9): el pivoteo propuesto nunca se ejecuta, así que
    // sale/filaPivote/elementoPivote deben quedar ausentes (la UI no debe mostrar un
    // pivoteo que no ocurrió).
    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    expect(ultima.decision!.sale).toBeUndefined();
    expect(ultima.decision!.filaPivote).toBeUndefined();
    expect(ultima.decision!.elementoPivote).toBeUndefined();
    expect(ultima.decision!.operaciones).toEqual([]);
  });

  // Regresión: bug de correctitud donde, si ninguna fila participaba del criterio de
  // salida, el motor diagnosticaba siempre `no_acotado` sin chequear si había una
  // artificial básica positiva — en cuyo caso el diagnóstico correcto es `infactible`
  // (docs/04 §3.3, §4.1). Modelo de contraejemplo:
  //   max Z = x1
  //   R1: x2 >= 1
  //   R2: x2 <= 0
  //   R3: -x1 + x2 <= 10
  // Tras el ajuste de M entra x2 (razones 1, 0, 10), sale S2 (degenerado). En la tabla
  // siguiente entra x1, cuya columna no tiene coeficiente positivo en ninguna fila →
  // ninguna fila participa, pero A1 sigue básica con valor 1 > 0 → infactible.
  it("infactible detectado cuando ninguna fila participa del criterio de salida (no es no_acotado)", () => {
    const modelo: ModeloLineal = {
      version: 1,
      origen: "ejemplo",
      variables: [
        { nombre: "x1", etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
        { nombre: "x2", etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
      ],
      objetivo: { sentido: "max", coeficientes: ["1", "0"], simbolo: "Z" },
      restricciones: [
        { numero: 1, nombre: "Restricción 1", coeficientes: ["0", "1"], relacion: ">=", limite: "1" },
        { numero: 2, nombre: "Restricción 2", coeficientes: ["0", "1"], relacion: "<=", limite: "0" },
        { numero: 3, nombre: "Restricción 3", coeficientes: ["-1", "1"], relacion: "<=", limite: "10" },
      ],
      naturaleza: "fraccionaria",
    };

    const resultado = resolverSimplex(modelo);

    expect(resultado.estado).toBe("infactible");
    expect(resultado.solucion).toBeUndefined();
    expect(trazaDe(resultado.tablas)).toEqual([
      { entra: "x2", sale: "S2", pivote: "1" },
      { entra: "x1", sale: null, pivote: null },
    ]);

    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    const idxA1 = ultima.base.indexOf("A1");
    expect(idxA1).toBeGreaterThanOrEqual(0);
    expect(ultima.ladoDerecho[idxA1]!.esPositiva()).toBe(true);
  });
});

describe("resolverSimplex — invariantes generales (docs/04 §7)", () => {
  function mcd(a: bigint, b: bigint): bigint {
    let x = a < 0n ? -a : a;
    let y = b < 0n ? -b : b;
    while (y !== 0n) {
      const r = x % y;
      x = y;
      y = r;
    }
    return x;
  }

  it.each(CASOS.map((c) => [c.id, c] as const))(
    "%s: toda fracción está normalizada y cada columna básica es un vector unitario",
    (_id, caso: CasoPrueba) => {
      const resultado = resolverSimplex(caso.modelo);

      for (const tabla of resultado.tablas) {
        for (const fila of tabla.filas) {
          for (const f of fila) {
            expect(mcd(f.num, f.den)).toBe(1n);
            expect(f.den > 0n).toBe(true);
          }
        }
        for (const r of tabla.ladoDerecho) {
          expect(mcd(r.num, r.den)).toBe(1n);
        }

        tabla.base.forEach((nombreBasica, filaBasica) => {
          const colIndice = resultado.columnas.findIndex((c) => c.id === nombreBasica);
          expect(colIndice).toBeGreaterThanOrEqual(0);
          tabla.filas.forEach((fila, i) => {
            const esperado = i === filaBasica ? Fraccion.UNO : Fraccion.CERO;
            expect(fila[colIndice]!.igual(esperado)).toBe(true);
          });
          // La fila Z también debe tener costo reducido 0 en cada columna básica.
          expect(tabla.filaZ[colIndice]!.a.esCero() && tabla.filaZ[colIndice]!.b.esCero()).toBe(true);
        });
      }
    },
  );
});

describe("resolverSimplex — equivalencia min/max (docs/04 §7)", () => {
  it("min Z = cx da el mismo punto que max -cx, con Z opuesto (C5)", () => {
    const resultadoMin = resolverSimplex(C5.modelo);
    const modeloMax = {
      ...C5.modelo,
      objetivo: {
        ...C5.modelo.objetivo,
        sentido: "max" as const,
        coeficientes: C5.modelo.objetivo.coeficientes.map((c) => `-${c}`),
      },
    };
    const resultadoMax = resolverSimplex(modeloMax);

    expect(resultadoMax.estado).toBe(resultadoMin.estado);
    expect(resultadoMax.solucion!.valores.x1!.igual(resultadoMin.solucion!.valores.x1!)).toBe(true);
    expect(resultadoMax.solucion!.valores.x2!.igual(resultadoMin.solucion!.valores.x2!)).toBe(true);
    expect(resultadoMax.solucion!.z.igual(resultadoMin.solucion!.z.negar())).toBe(true);
  });

  it("min Z = cx da el mismo punto que max -cx, con Z opuesto (C11, mixto)", () => {
    const resultadoMin = resolverSimplex(C11.modelo);
    const modeloMax = {
      ...C11.modelo,
      objetivo: {
        ...C11.modelo.objetivo,
        sentido: "max" as const,
        coeficientes: C11.modelo.objetivo.coeficientes.map((c) => `-${c}`),
      },
    };
    const resultadoMax = resolverSimplex(modeloMax);

    expect(resultadoMax.estado).toBe(resultadoMin.estado);
    for (const nombre of ["x1", "x2", "x3"]) {
      expect(resultadoMax.solucion!.valores[nombre]!.igual(resultadoMin.solucion!.valores[nombre]!)).toBe(true);
    }
    expect(resultadoMax.solucion!.z.igual(resultadoMin.solucion!.z.negar())).toBe(true);
  });
});

describe("detalleCeldas", () => {
  it("el resultado de cada celda coincide con la tabla siguiente (C1, iteración 1)", () => {
    const resultado = resolverSimplex(C1.modelo);
    const tabla0 = resultado.tablas[0]!;
    const tabla1 = resultado.tablas[1]!;
    const detalle = detalleCeldas(tabla0, tabla0.decision!);

    // Filas de restricción: últimas columnas son R.
    tabla1.filas.forEach((filaEsperada, i) => {
      filaEsperada.forEach((valorEsperado, j) => {
        const celda = detalle[i]![j]!;
        expect((celda.resultado as Fraccion).igual(valorEsperado)).toBe(true);
      });
      const rEsperado = tabla1.ladoDerecho[i]!;
      const celdaR = detalle[i]![filaEsperada.length]!;
      expect((celdaR.resultado as Fraccion).igual(rEsperado)).toBe(true);
    });

    // Fila Z es la última fila del detalle.
    const filaZDetalle = detalle[detalle.length - 1]!;
    tabla1.filaZ.forEach((valorEsperado, j) => {
      const celda = filaZDetalle[j]!;
      expect((celda.resultado as import("../aritmetica/valor-m").ValorM).comparar(valorEsperado)).toBe(0);
    });
  });

  it("devuelve [] cuando la decisión no tiene fila pivote (no acotado)", () => {
    const resultado = resolverSimplex(C8.modelo);
    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    expect(detalleCeldas(ultima, ultima.decision!)).toEqual([]);
  });
});

describe("resolverSimplex — avisos no_entera / objetivo_cero", () => {
  it("objetivo_cero: todos los coeficientes de la función objetivo son 0", () => {
    const modelo = {
      ...C2.modelo,
      objetivo: { ...C2.modelo.objetivo, coeficientes: ["0", "0"] },
    };
    const resultado = resolverSimplex(modelo);
    expect(resultado.avisos.some((a) => a.codigo === "objetivo_cero")).toBe(true);
  });
});
