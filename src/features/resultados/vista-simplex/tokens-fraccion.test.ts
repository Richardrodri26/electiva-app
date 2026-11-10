import { describe, expect, it } from "vitest";

import { Fraccion } from "@/dominio/aritmetica/fraccion";

import { tokensExpresionFraccion, tokensRestriccionFraccion } from "./tokens-fraccion";

describe("tokensExpresionFraccion", () => {
  it("omite los términos en 0 y el coeficiente 1 implícito", () => {
    const tokens = tokensExpresionFraccion([Fraccion.de(1), Fraccion.CERO, Fraccion.de(-3)], ["x1", "x2", "x3"], "fraccion");
    expect(tokens).toEqual([
      { tipo: "var", texto: "x1" },
      { tipo: "op", texto: " − " },
      { tipo: "coef", texto: "3" },
      { tipo: "var", texto: "x3" },
    ]);
  });

  it("devuelve '0' cuando todos los términos son 0", () => {
    const tokens = tokensExpresionFraccion([Fraccion.CERO, Fraccion.CERO], ["x1", "x2"], "fraccion");
    expect(tokens).toEqual([{ tipo: "coef", texto: "0" }]);
  });

  it("antepone el signo menos tipográfico si el primer término es negativo", () => {
    const tokens = tokensExpresionFraccion([Fraccion.de(-3), Fraccion.de(2)], ["x1", "x2"], "fraccion");
    expect(tokens[0]).toEqual({ tipo: "op", texto: "−" });
  });
});

describe("tokensRestriccionFraccion", () => {
  it("reproduce el ejemplo de normalización de docs/08 C1 (R2)", () => {
    // R2 normalizada: 3x1 - 2x2 <= 18 (docs/08-casos-de-prueba.md C1).
    const tokens = tokensRestriccionFraccion(
      [Fraccion.de(3), Fraccion.de(-2)],
      ["x1", "x2"],
      "<=",
      Fraccion.de(18),
      "fraccion",
    );
    expect(tokens).toEqual([
      { tipo: "coef", texto: "3" },
      { tipo: "var", texto: "x1" },
      { tipo: "op", texto: " − " },
      { tipo: "coef", texto: "2" },
      { tipo: "var", texto: "x2" },
      { tipo: "rel", texto: " ≤ " },
      { tipo: "num", texto: "18" },
    ]);
  });
});
