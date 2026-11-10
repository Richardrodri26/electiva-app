import { describe, expect, it } from "vitest";

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import { ValorM } from "@/dominio/aritmetica/valor-m";
import { C1 } from "@/dominio/__fixtures__/casos";
import { resolverSimplex } from "@/dominio/simplex/resolver";
import type { DecisionIteracion, TablaSimplex } from "@/dominio/simplex/tipos";

import { describirOperacion, filasSinCambio } from "./operaciones";

describe("describirOperacion", () => {
  it("describe la operación 'normalizar' con la fila anterior (la que sale)", () => {
    const resultado = resolverSimplex(C1.modelo);
    // tablas[1] = tabla tras la iteración 1 (docs/08 C1): decisión entra x2 / sale S3 / pivote 16/3.
    const decision = resultado.tablas[1]!.decision!;
    const normalizar = decision.operaciones.find((op) => op.tipo === "normalizar")!;
    expect(describirOperacion(normalizar, "fraccion", decision.sale)).toBe("Fila x2 ← Fila S3 ÷ 16/3");
  });

  it("describe una operación 'eliminar' con el factor y la fila origen", () => {
    const resultado = resolverSimplex(C1.modelo);
    const decision = resultado.tablas[1]!.decision!;
    const eliminarS1 = decision.operaciones.find((op) => op.tipo === "eliminar" && op.fila === "S1")!;
    expect(describirOperacion(eliminarS1, "fraccion")).toBe(
      "Fila S1 ← Fila S1 − (19/3)·(nueva fila x2)",
    );
  });
});

describe("filasSinCambio", () => {
  it("identifica las filas sin operación 'eliminar' (coeficiente 0 en la columna pivote), excluida la que sale", () => {
    const tabla: TablaSimplex = {
      indice: 0,
      base: ["A", "B", "C"],
      filas: [[], [], []],
      ladoDerecho: [Fraccion.CERO, Fraccion.CERO, Fraccion.CERO],
      filaZ: [],
      valorZ: new ValorM(Fraccion.CERO),
    };
    const decision: DecisionIteracion = {
      entra: "ENTRA",
      columnaPivote: 0,
      razones: [],
      sale: "B",
      filaPivote: 1,
      elementoPivote: Fraccion.UNO,
      empateEntrada: false,
      empateSalida: false,
      operaciones: [
        { tipo: "eliminar", fila: "A", factor: Fraccion.UNO, filaOrigen: "ENTRA" },
        { tipo: "normalizar", fila: "ENTRA", divisor: Fraccion.UNO },
      ],
    };

    expect(filasSinCambio(tabla, decision)).toEqual(["C", "Z"]);
  });

  it("no excluye 'Z' si tampoco tuvo operación", () => {
    const tabla: TablaSimplex = {
      indice: 0,
      base: ["A", "B"],
      filas: [[], []],
      ladoDerecho: [Fraccion.CERO, Fraccion.CERO],
      filaZ: [],
      valorZ: new ValorM(Fraccion.CERO),
    };
    const decision: DecisionIteracion = {
      entra: "ENTRA",
      columnaPivote: 0,
      razones: [],
      sale: "A",
      filaPivote: 0,
      elementoPivote: Fraccion.UNO,
      empateEntrada: false,
      empateSalida: false,
      operaciones: [{ tipo: "eliminar", fila: "B", factor: Fraccion.UNO, filaOrigen: "ENTRA" }],
    };

    expect(filasSinCambio(tabla, decision)).toEqual(["Z"]);
  });
});
