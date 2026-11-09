import { describe, expect, it } from "vitest";
import {
  CATEGORIAS,
  CANTIDADES_OPCIONES,
  CANTIDADES_RESTRICCIONES,
  FORMAS_CUMPLIMIENTO,
  METAS,
  OPCIONES_NATURALEZA,
  TIPOS_RESTRICCION,
  UNIDADES,
  VERBOS_POR_CATEGORIA,
  naturalezaDesdeOpcion,
  relacionDesdeFormaCumplimiento,
  sentidoDesdeMeta,
} from "./catalogos";

describe("catálogos transcritos de console-program", () => {
  it("METAS tiene las 6 metas del CLI, en orden", () => {
    expect(METAS.map((m) => m.etiqueta)).toEqual([
      "Mayor utilidad",
      "Mayor ingreso",
      "Más solicitudes atendidas",
      "Menor costo",
      "Menor tiempo",
      "Menor uso de recursos",
    ]);
  });

  it("CATEGORIAS tiene las 4 categorías del CLI, en orden", () => {
    expect(CATEGORIAS.map((c) => c.etiqueta)).toEqual([
      "Productos",
      "Servicios",
      "Trabajos o proyectos",
      "Recursos tecnológicos",
    ]);
  });

  it("VERBOS_POR_CATEGORIA coincide 1 a 1 con CATEGORIAS", () => {
    expect(VERBOS_POR_CATEGORIA).toEqual({
      1: "producirán",
      2: "prestarán",
      3: "realizarán",
      4: "contratarán",
    });
  });

  it("UNIDADES tiene las 6 unidades del CLI, terminando en 'Otra'", () => {
    expect(UNIDADES.map((u) => u.etiqueta)).toEqual([
      "Unidades",
      "Horas",
      "Toneladas",
      "GB",
      "Servicios",
      "Otra",
    ]);
  });

  it("TIPOS_RESTRICCION tiene los 8 tipos del CLI, terminando en 'Otra'", () => {
    expect(TIPOS_RESTRICCION.map((t) => t.etiqueta)).toEqual([
      "Presupuesto",
      "Horas",
      "Procesamiento",
      "Memoria o almacenamiento",
      "Cantidad máxima",
      "Pedido mínimo",
      "Cantidad total",
      "Otra",
    ]);
  });

  it("FORMAS_CUMPLIMIENTO tiene las 3 formas del CLI, en orden", () => {
    expect(FORMAS_CUMPLIMIENTO.map((f) => f.etiqueta)).toEqual([
      "No se puede superar",
      "Se debe alcanzar como mínimo",
      "Se debe cumplir exactamente",
    ]);
  });

  it("OPCIONES_NATURALEZA tiene las 2 opciones del CLI, en orden", () => {
    expect(OPCIONES_NATURALEZA.map((o) => o.etiqueta)).toEqual([
      "Deben ser unidades completas (enteras)",
      "Pueden ser fraccionarias (decimales)",
    ]);
  });

  it("CANTIDADES_OPCIONES y CANTIDADES_RESTRICCIONES conservan el menú cerrado original del CLI", () => {
    expect(CANTIDADES_OPCIONES.map((o) => o.valor)).toEqual([2, 3]);
    expect(CANTIDADES_RESTRICCIONES.map((r) => r.valor)).toEqual([2, 3, 4]);
  });
});

describe("sentidoDesdeMeta — regla exacta de definirObjetivo.ts", () => {
  it.each([
    [1, "max"],
    [2, "max"],
    [3, "max"],
    [4, "min"],
    [5, "min"],
    [6, "min"],
  ] as const)("meta %i -> %s", (meta, esperado) => {
    expect(sentidoDesdeMeta(meta)).toBe(esperado);
  });
});

describe("relacionDesdeFormaCumplimiento — regla exacta de definirRestricciones.ts", () => {
  it("1 -> '<='", () => {
    expect(relacionDesdeFormaCumplimiento(1)).toBe("<=");
  });
  it("2 -> '>='", () => {
    expect(relacionDesdeFormaCumplimiento(2)).toBe(">=");
  });
  it("3 -> '='", () => {
    expect(relacionDesdeFormaCumplimiento(3)).toBe("=");
  });
});

describe("naturalezaDesdeOpcion — regla exacta de definirNaturaleza.ts", () => {
  it("1 -> 'entera'", () => {
    expect(naturalezaDesdeOpcion(1)).toBe("entera");
  });
  it("2 -> 'fraccionaria'", () => {
    expect(naturalezaDesdeOpcion(2)).toBe("fraccionaria");
  });
});
