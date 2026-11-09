import { describe, expect, it } from "vitest";
import { parsearFraccion } from "../aritmetica/parseo";
import { C1, C2, C2_E, C3, C4, C5, C6, C7, C8, C9, C12, CASOS } from "../__fixtures__/casos";
import type { ModeloLineal, Relacion, Restriccion, Variable } from "../modelo/tipos";
import type { Punto } from "./tipos";
import { resolverGrafico } from "./resolver";

/** Variable con etiqueta/definición por defecto — mismo criterio que `__fixtures__/casos.ts`. */
function variable(nombre: string): Variable {
  return { nombre, etiqueta: nombre, definicion: `${nombre} = variable de decisión ${nombre.slice(1)}.` };
}

function restriccion(numero: number, coeficientes: string[], relacion: Relacion, limite: string): Restriccion {
  return { numero, nombre: `Restricción ${numero}`, coeficientes, relacion, limite };
}

function modelo(opciones: {
  sentido: "max" | "min";
  coeficientesObjetivo: [string, string];
  restricciones: Restriccion[];
  naturaleza?: "entera" | "fraccionaria";
}): ModeloLineal {
  return {
    version: 1,
    origen: "ejemplo",
    variables: [variable("x1"), variable("x2")],
    objetivo: { sentido: opciones.sentido, coeficientes: opciones.coeficientesObjetivo, simbolo: "Z" },
    restricciones: opciones.restricciones,
    naturaleza: opciones.naturaleza ?? "fraccionaria",
  };
}

function puntoIgual(p: Punto, x1: string, x2: string): boolean {
  return p.x1.igual(parsearFraccion(x1)) && p.x2.igual(parsearFraccion(x2));
}

/** Verifica que el conjunto de vértices (coordenadas + Z) coincide exactamente con lo esperado, sin importar el orden. */
function esperarVertices(
  vertices: ReturnType<typeof resolverGrafico>["vertices"],
  esperados: Array<{ punto: [string, string]; z: string }>,
) {
  expect(vertices).toHaveLength(esperados.length);
  for (const esperado of esperados) {
    const encontrado = vertices.find((v) => puntoIgual(v.punto, esperado.punto[0], esperado.punto[1]));
    expect(encontrado, `no se encontró el vértice (${esperado.punto.join(",")})`).toBeDefined();
    expect(encontrado!.z.igual(parsearFraccion(esperado.z))).toBe(true);
  }
}

describe("resolverGrafico", () => {
  describe("casos de docs/08-casos-de-prueba.md (2 variables)", () => {
    const casosDosVariables = CASOS.filter((c) => c.grafico !== null);

    it("el estado coincide con el del Simplex para todos los casos de 2 variables", () => {
      for (const caso of casosDosVariables) {
        const resultado = resolverGrafico(caso.modelo);
        expect(resultado.estado, `caso ${caso.id}`).toBe(caso.simplex.estado);
      }
    });

    it("C1: vértices exactos y óptimo", () => {
      const r = resolverGrafico(C1.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["6", "0"], z: "18" },
        { punto: ["31/4", "21/8"], z: "57/2" },
        { punto: ["0", "13/2"], z: "13" },
      ]);
      expect(r.regionAcotada).toBe(true);
      expect(r.optimo?.punto && puntoIgual(r.optimo.punto, "31/4", "21/8")).toBe(true);
      expect(r.optimo?.z.igual(parsearFraccion("57/2"))).toBe(true);
      // A = más cercano al origen, orden antihorario (docs/05 §2.7).
      expect(r.vertices.map((v) => v.id)).toEqual(["A", "B", "C", "D"]);
      expect(puntoIgual(r.vertices[0]!.punto, "0", "0")).toBe(true);
    });

    it("C2: vértices exactos y óptimo", () => {
      const r = resolverGrafico(C2.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["4", "0"], z: "12" },
        { punto: ["8/3", "8/3"], z: "64/3" },
        { punto: ["0", "4"], z: "20" },
      ]);
      expect(puntoIgual(r.optimo!.punto, "8/3", "8/3")).toBe(true);
    });

    it("C3: vértices exactos y óptimo", () => {
      const r = resolverGrafico(C3.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["6", "0"], z: "24" },
        { punto: ["5", "2"], z: "26" },
        { punto: ["0", "7"], z: "21" },
      ]);
      expect(puntoIgual(r.optimo!.punto, "5", "2")).toBe(true);
    });

    it("C4: vértices exactos y óptimo", () => {
      const r = resolverGrafico(C4.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["7", "0"], z: "42" },
        { punto: ["24/5", "22/5"], z: "232/5" },
        { punto: ["0", "6"], z: "24" },
      ]);
      expect(puntoIgual(r.optimo!.punto, "24/5", "22/5")).toBe(true);
    });

    it("C5: región no acotada con óptimo acotado (min)", () => {
      const r = resolverGrafico(C5.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "4"], z: "12" },
        { punto: ["3", "1"], z: "9" },
        { punto: ["6", "0"], z: "12" },
      ]);
      expect(r.regionAcotada).toBe(false);
      expect(r.estado).toBe("optimo");
      expect(puntoIgual(r.optimo!.punto, "3", "1")).toBe(true);
      expect(r.optimo!.z.igual(parsearFraccion("9"))).toBe(true);
    });

    it("C6: restricción de igualdad, región = segmento", () => {
      const r = resolverGrafico(C6.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "5"], z: "10" },
        { punto: ["3", "2"], z: "7" },
      ]);
      expect(r.regionAcotada).toBe(true);
      expect(r.estado).toBe("optimo");
      expect(puntoIgual(r.optimo!.punto, "0", "5")).toBe(true);
    });

    it("C7: infactible", () => {
      const r = resolverGrafico(C7.modelo);
      expect(r.estado).toBe("infactible");
      expect(r.vertices).toHaveLength(0);
      expect(r.optimo).toBeUndefined();
    });

    it("C8: no acotado — vértices derivados a mano (docs/08 no los enumera para este caso)", () => {
      // docs/08 solo dice "Gráfico: no_acotado" para C8, sin listar vértices (por eso el fixture
      // trae `vertices: []`, que no es el valor real esperado). Derivación manual del modelo
      // (max Z=x1+x2, R1: x1-x2<=1, x1,x2>=0): la región es una cuña no acotada con dos
      // vértices finitos, (0,0) y (1,0); la dirección (0,1) mejora Z sin cota -> no_acotado.
      const r = resolverGrafico(C8.modelo);
      expect(r.estado).toBe("no_acotado");
      expect(r.regionAcotada).toBe(false);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["1", "0"], z: "1" },
      ]);
      expect(r.optimo).toBeUndefined();
    });

    it("C9: óptimos alternativos — segmento óptimo exacto (docs/08 solo lista ese segmento, no los 4 vértices)", () => {
      // El modelo real (x1+2x2<=8, x1<=6, x1,x2>=0) tiene 4 vértices: (0,0), (6,0), (6,1), (0,4).
      // docs/08 solo transcribe el segmento óptimo entre (0,4) y (6,1), así que se verifica el
      // conjunto completo (matemáticamente correcto) y por separado el segmento óptimo del fixture.
      const r = resolverGrafico(C9.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["6", "0"], z: "12" },
        { punto: ["6", "1"], z: "16" },
        { punto: ["0", "4"], z: "16" },
      ]);
      expect(r.estado).toBe("optimos_alternativos");
      expect(r.segmentoOptimo).toBeDefined();
      const [a, b] = r.segmentoOptimo!;
      const extremos = [a, b];
      expect(extremos.some((p) => puntoIgual(p, "6", "1"))).toBe(true);
      expect(extremos.some((p) => puntoIgual(p, "0", "4"))).toBe(true);
    });

    it("C12: igualdad con lado derecho negativo normalizado — óptimos alternativos", () => {
      const r = resolverGrafico(C12.modelo);
      esperarVertices(r.vertices, [
        { punto: ["0", "4"], z: "4" },
        { punto: ["3", "1"], z: "4" },
      ]);
      expect(r.estado).toBe("optimos_alternativos");
      expect(r.segmentoOptimo).toBeDefined();
      const extremos = r.segmentoOptimo!;
      expect(extremos.some((p) => puntoIgual(p, "0", "4"))).toBe(true);
      expect(extremos.some((p) => puntoIgual(p, "3", "1"))).toBe(true);
    });

    it("C2-E: 17 puntos enteros factibles, mejor entero (2,3) con Z=21", () => {
      const r = resolverGrafico(C2_E.modelo);
      expect(r.puntosEnteros).toBeDefined();
      expect(r.puntosEnteros).toHaveLength(17);
      expect(r.mejorEntero).toBeDefined();
      expect(puntoIgual(r.mejorEntero!.punto, "2", "3")).toBe(true);
      expect(r.mejorEntero!.z.igual(parsearFraccion("21"))).toBe(true);
      expect(r.avisos).toBeUndefined();
    });
  });

  describe("casos de borde de docs/05-metodo-grafico.md §6", () => {
    it("recta vertical y horizontal: rectángulo acotado", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [restriccion(1, ["1", "0"], "<=", "3"), restriccion(2, ["0", "1"], "<=", "4")],
      });
      const r = resolverGrafico(m);
      expect(r.regionAcotada).toBe(true);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["3", "0"], z: "3" },
        { punto: ["3", "4"], z: "7" },
        { punto: ["0", "4"], z: "4" },
      ]);
      expect(r.estado).toBe("optimo");
      expect(puntoIgual(r.optimo!.punto, "3", "4")).toBe(true);

      const rectaVertical = r.rectas.find((rec) => rec.restriccion === 1)!;
      expect(rectaVertical.interceptos.x1?.igual(parsearFraccion("3"))).toBe(true);
      expect(rectaVertical.interceptos.x2).toBeUndefined();

      const rectaHorizontal = r.rectas.find((rec) => rec.restriccion === 2)!;
      expect(rectaHorizontal.interceptos.x2?.igual(parsearFraccion("4"))).toBe(true);
      expect(rectaHorizontal.interceptos.x1).toBeUndefined();
    });

    it("rectas paralelas: la más laxa no agrega vértices", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "2"],
        restricciones: [
          restriccion(1, ["1", "1"], "<=", "10"),
          restriccion(2, ["1", "1"], "<=", "6"),
        ],
      });
      const r = resolverGrafico(m);
      expect(r.regionAcotada).toBe(true);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["6", "0"], z: "6" },
        { punto: ["0", "6"], z: "12" },
      ]);
      expect(r.estado).toBe("optimo");
      expect(puntoIgual(r.optimo!.punto, "0", "6")).toBe(true);
    });

    it("región que degenera en un único punto (dos igualdades)", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [restriccion(1, ["1", "0"], "=", "3"), restriccion(2, ["0", "1"], "=", "2")],
      });
      const r = resolverGrafico(m);
      expect(r.vertices).toHaveLength(1);
      expect(r.regionAcotada).toBe(true);
      expect(r.estado).toBe("optimo");
      expect(puntoIgual(r.vertices[0]!.punto, "3", "2")).toBe(true);
      expect(r.vertices[0]!.id).toBe("A");
      expect(r.optimo!.z.igual(parsearFraccion("5"))).toBe(true);
    });

    it("0x1 + 0x2 <= 5: restricción siempre verdadera, se ignora", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [
          restriccion(1, ["0", "0"], "<=", "5"),
          restriccion(2, ["1", "1"], "<=", "5"),
        ],
      });
      const r = resolverGrafico(m);
      // La restricción 1 no es una recta: no debe aparecer en `rectas`.
      expect(r.rectas.some((rec) => rec.restriccion === 1)).toBe(false);
      expect(r.rectas.some((rec) => rec.restriccion === 2)).toBe(true);
      esperarVertices(r.vertices, [
        { punto: ["0", "0"], z: "0" },
        { punto: ["5", "0"], z: "5" },
        { punto: ["0", "5"], z: "5" },
      ]);
      expect(r.estado).toBe("optimos_alternativos");
    });

    it("0x1 + 0x2 <= -5: siempre falsa, el modelo es infactible", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [
          restriccion(1, ["0", "0"], "<=", "-5"),
          restriccion(2, ["1", "1"], "<=", "10"),
        ],
      });
      const r = resolverGrafico(m);
      expect(r.estado).toBe("infactible");
      expect(r.vertices).toHaveLength(0);
    });

    it("más de 2500 puntos enteros: avisa pero igual calcula el mejor entero", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [restriccion(1, ["1", "0"], "<=", "60"), restriccion(2, ["0", "1"], "<=", "60")],
        naturaleza: "entera",
      });
      const r = resolverGrafico(m);
      expect(r.puntosEnteros).toBeUndefined();
      expect(r.avisos).toEqual(["Hay demasiados puntos enteros para mostrarlos"]);
      expect(r.mejorEntero).toBeDefined();
      expect(puntoIgual(r.mejorEntero!.punto, "60", "60")).toBe(true);
      expect(r.mejorEntero!.z.igual(parsearFraccion("120"))).toBe(true);
    });
  });

  describe("validación de entrada", () => {
    it("rechaza modelos que no tienen exactamente 2 variables", () => {
      const m = modelo({
        sentido: "max",
        coeficientesObjetivo: ["1", "1"],
        restricciones: [restriccion(1, ["1", "1"], "<=", "10")],
      });
      const m3 = { ...m, variables: [...m.variables, variable("x3")] };
      expect(() => resolverGrafico(m3 as ModeloLineal)).toThrow();
    });
  });
});
