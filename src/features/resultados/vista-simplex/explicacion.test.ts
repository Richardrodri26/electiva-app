import { describe, expect, it } from "vitest";

import { C1, C8, C9 } from "@/dominio/__fixtures__/casos";
import { resolverSimplex } from "@/dominio/simplex/resolver";

import { construirExplicacionAlternativa, construirExplicacionDecision } from "./explicacion";

describe("construirExplicacionDecision", () => {
  it("devuelve null para la tabla final (sin decisión)", () => {
    const resultado = resolverSimplex(C1.modelo);
    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    expect(ultima.decision).toBeUndefined();
    expect(construirExplicacionDecision(ultima, "max", "fraccion")).toBeNull();
  });

  it("describe entra/sale/pivote de la tabla tras la iteración 1 de C1 (docs/08 §1 C1)", () => {
    const resultado = resolverSimplex(C1.modelo);
    const tabla = resultado.tablas[1]!;
    const texto = construirExplicacionDecision(tabla, "max", "fraccion");
    expect(texto).toBe("Entra x2 (-4 es el más negativo) · Sale S3 (razón menor 21/8) · Pivote 16/3.");
  });

  it("describe el caso sin fila de salida válida (no acotado, C8)", () => {
    const resultado = resolverSimplex(C8.modelo);
    expect(resultado.estado).toBe("no_acotado");
    const ultima = resultado.tablas[resultado.tablas.length - 1]!;
    const texto = construirExplicacionDecision(ultima, "max", "fraccion");
    expect(texto).not.toBeNull();
    expect(texto).toContain("Ninguna fila tiene una razón válida para salir");
  });
});

describe("construirExplicacionAlternativa", () => {
  it("describe el pivoteo extra de C9 (óptimos alternativos)", () => {
    const resultado = resolverSimplex(C9.modelo);
    expect(resultado.estado).toBe("optimos_alternativos");
    const alternativa = resultado.alternativa!;
    const texto = construirExplicacionAlternativa(alternativa.decision, "fraccion");
    expect(texto).toContain(`La columna ${alternativa.decision.entra} tiene costo reducido 0`);
    expect(texto).toContain(`Sale ${alternativa.decision.sale}`);
  });
});
