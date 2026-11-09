import { describe, expect, it } from "vitest";
import { C1, C2_E, C5, C6 } from "../__fixtures__/casos";
import type { ModeloLineal } from "../modelo/tipos";
import {
  interpretarObjetivo,
  interpretarRestriccion,
  interpretarResultado,
  interpretarVariable,
  recorridoSimplex,
} from "./interpretar";
import { resolverSimplex } from "./resolver";
import { Fraccion } from "../aritmetica/fraccion";

describe("interpretarResultado — C1 (interpretación con holguras)", () => {
  const resultado = resolverSimplex(C1.modelo);

  it("variables sin contexto: 'x_j = valor'", () => {
    const interpretacion = interpretarResultado(C1.modelo, resultado);
    expect(interpretacion?.variables).toEqual(["x1 = 31/4", "x2 = 21/8"]);
  });

  it("restricciones calculadas sobre los valores originales (R2 es >= -18, no <= 18)", () => {
    const interpretacion = interpretarResultado(C1.modelo, resultado);
    expect(interpretacion?.restricciones).toEqual([
      "Sobran 51/8 de «Restricción 1» (se usan 229/8 de 35).",
      "Se cumple justo el mínimo de «Restricción 2».",
      "Se usa todo lo disponible de «Restricción 3».",
    ]);
  });

  it("objetivo sin meta: 'Máximo/Mínimo de Z = {z}'", () => {
    const interpretacion = interpretarResultado(C1.modelo, resultado);
    expect(interpretacion?.objetivo).toBe("Máximo de Z = 57/2");
  });
});

describe("interpretarResultado — C5 (con excesos, Gran M)", () => {
  const resultado = resolverSimplex(C5.modelo);

  it("ambas restricciones >= se cumplen justo en el óptimo (exceso 0)", () => {
    const interpretacion = interpretarResultado(C5.modelo, resultado);
    expect(interpretacion?.restricciones).toEqual([
      "Se cumple justo el mínimo de «Restricción 1».",
      "Se cumple justo el mínimo de «Restricción 2».",
    ]);
    expect(interpretacion?.objetivo).toBe("Mínimo de Z = 9");
    expect(interpretacion?.variables).toEqual(["x1 = 3", "x2 = 1"]);
  });

  it("interpretarRestriccion con exceso > 0 (punto no óptimo, ej. (0,5))", () => {
    const [r1, r2] = C5.modelo.restricciones;
    const valores = { x1: Fraccion.CERO, x2: Fraccion.de(5) };
    // R1: x1 + x2 >= 4 -> usado = 5, excede el mínimo en 1.
    expect(interpretarRestriccion(r1!, C5.modelo.variables, valores)).toBe(
      "Se supera el mínimo de «Restricción 1» en 1.",
    );
    // R2: x1 + 3x2 >= 6 -> usado = 15, excede el mínimo en 9.
    expect(interpretarRestriccion(r2!, C5.modelo.variables, valores)).toBe(
      "Se supera el mínimo de «Restricción 2» en 9.",
    );
  });
});

describe("interpretarResultado — C6 (con igualdad)", () => {
  const resultado = resolverSimplex(C6.modelo);

  it("la restricción de igualdad se interpreta como cumplimiento exacto", () => {
    const interpretacion = interpretarResultado(C6.modelo, resultado);
    expect(interpretacion?.restricciones).toEqual([
      "«Restricción 1» se cumple exactamente.",
      "Sobran 3 de «Restricción 2» (se usan 0 de 3).",
    ]);
    expect(interpretacion?.variables).toEqual(["x1 = 0", "x2 = 5"]);
    expect(interpretacion?.objetivo).toBe("Máximo de Z = 10");
  });
});

describe("interpretarResultado — C2-E (aviso de solución no entera)", () => {
  const resultado = resolverSimplex(C2_E.modelo);

  it("sigue produciendo la interpretación aunque la solución no sea entera", () => {
    expect(resultado.avisos.map((a) => a.codigo)).toContain("no_entera");
    const interpretacion = interpretarResultado(C2_E.modelo, resultado);
    expect(interpretacion?.variables).toEqual(["x1 = 8/3", "x2 = 8/3"]);
  });
});

describe("interpretarVariable — con contexto del asistente", () => {
  it("omite la unidad cuando es 'Unidades' y usa el verbo en futuro", () => {
    const variable = C1.modelo.variables[0]!;
    const texto = interpretarVariable(variable, Fraccion.de(31, 4), { categoria: 1, unidad: "Unidades" });
    expect(texto).toBe("Se producirán 31/4 de x1.");
  });

  it("muestra la unidad en minúscula cuando no es 'Unidades'", () => {
    const variable = C1.modelo.variables[0]!;
    const texto = interpretarVariable(variable, Fraccion.de(10), { categoria: 2, unidad: "Horas" });
    expect(texto).toBe("Se prestarán 10 horas de x1.");
  });
});

describe("interpretarObjetivo — con meta del asistente", () => {
  it("usa la etiqueta de la meta en vez de 'Máximo/Mínimo' cuando hay meta", () => {
    const objetivo = { ...C1.modelo.objetivo, meta: 1 as const };
    expect(interpretarObjetivo(objetivo, Fraccion.de(57, 2))).toBe("Mayor utilidad: Z = 57/2");
  });
});

describe("recorridoSimplex", () => {
  it("C1: (0,0) -> (6,0) -> (31/4, 21/8), todo factible", () => {
    const resultado = resolverSimplex(C1.modelo);
    const recorrido = recorridoSimplex(resultado, C1.modelo);

    expect(recorrido.map((p) => [p.x1.aTexto(), p.x2.aTexto(), p.factible])).toEqual([
      ["0", "0", true],
      ["6", "0", true],
      ["31/4", "21/8", true],
    ]);
  });

  it("C5: pasa por puntos infactibles mientras hay artificiales básicas > 0", () => {
    const resultado = resolverSimplex(C5.modelo);
    const recorrido = recorridoSimplex(resultado, C5.modelo);

    expect(recorrido.map((p) => [p.x1.aTexto(), p.x2.aTexto(), p.factible])).toEqual([
      ["0", "0", false],
      ["0", "2", false],
      ["3", "1", true],
    ]);
  });

  it("lanza si el modelo no tiene exactamente 2 variables", () => {
    const resultado = resolverSimplex(C1.modelo);
    const modeloTresVariables: ModeloLineal = {
      ...C1.modelo,
      variables: [...C1.modelo.variables, { nombre: "x3", etiqueta: "x3", definicion: "x3 = variable de decisión 3." }],
    };
    expect(() => recorridoSimplex(resultado, modeloTresVariables)).toThrow();
  });
});
