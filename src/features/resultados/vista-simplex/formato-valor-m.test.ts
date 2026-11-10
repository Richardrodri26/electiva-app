import { describe, expect, it } from "vitest";

import { Fraccion } from "@/dominio/aritmetica/fraccion";
import { ValorM } from "@/dominio/aritmetica/valor-m";

import { absValorM, esValorMCero, formatearValorM } from "./formato-valor-m";

describe("esValorMCero", () => {
  it("es verdadero solo cuando a y b son cero", () => {
    expect(esValorMCero(new ValorM(Fraccion.CERO))).toBe(true);
    expect(esValorMCero(new ValorM(Fraccion.de(1)))).toBe(false);
    expect(esValorMCero(new ValorM(Fraccion.CERO, Fraccion.de(1)))).toBe(false);
  });
});

describe("absValorM", () => {
  it("deja igual un valor no negativo", () => {
    const v = new ValorM(Fraccion.de(2), Fraccion.de(3));
    expect(absValorM(v)).toBe(v);
  });

  it("niega ambos términos de un valor negativo", () => {
    const v = new ValorM(Fraccion.de(-2), Fraccion.de(-3));
    const resultado = absValorM(v);
    expect(resultado.a.aTexto()).toBe("2");
    expect(resultado.b.aTexto()).toBe("3");
  });
});

describe("formatearValorM", () => {
  it("en modo fracción delega en ValorM.aTexto()", () => {
    const v = new ValorM(Fraccion.de(-4));
    expect(formatearValorM(v, "fraccion")).toBe(v.aTexto());
    expect(formatearValorM(v, "fraccion")).toBe("-4");
  });

  it("en modo decimal, sin término M, usa Fraccion.aDecimal()", () => {
    const v = new ValorM(Fraccion.de(1, 2));
    expect(formatearValorM(v, "decimal")).toBe("0.5");
  });

  it("en modo decimal combina el término constante y el término M", () => {
    const v = new ValorM(Fraccion.de(1, 2), Fraccion.de(-3));
    expect(formatearValorM(v, "decimal")).toBe("0.5 - 3M");
  });

  it("en modo decimal omite el coeficiente 1 de M", () => {
    const v = new ValorM(Fraccion.CERO, Fraccion.de(1));
    expect(formatearValorM(v, "decimal")).toBe("M");
  });

  it("en modo decimal, sin término constante, antepone el signo de M", () => {
    const v = new ValorM(Fraccion.CERO, Fraccion.de(-1));
    expect(formatearValorM(v, "decimal")).toBe("-M");
  });

  it("en modo decimal, valor cero, devuelve '0'", () => {
    const v = new ValorM(Fraccion.CERO);
    expect(formatearValorM(v, "decimal")).toBe("0");
  });
});
