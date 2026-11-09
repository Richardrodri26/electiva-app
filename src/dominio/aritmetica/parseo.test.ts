import { describe, expect, it } from "vitest";
import { ErrorDivisionPorCero, Fraccion } from "./fraccion";
import { ErrorTextoInvalido, parsearFraccion } from "./parseo";

describe("parsearFraccion", () => {
  describe("tabla de docs/03 §1.3", () => {
    it('"12" -> 12/1', () => {
      expect(parsearFraccion("12").igual(Fraccion.de(12, 1))).toBe(true);
    });

    it('"12,5" -> 25/2', () => {
      expect(parsearFraccion("12,5").igual(Fraccion.de(25, 2))).toBe(true);
    });

    it('"12.5" -> 25/2', () => {
      expect(parsearFraccion("12.5").igual(Fraccion.de(25, 2))).toBe(true);
    });

    it('"-3" -> -3/1', () => {
      expect(parsearFraccion("-3").igual(Fraccion.de(-3, 1))).toBe(true);
    });

    it('"1/3" -> 1/3', () => {
      expect(parsearFraccion("1/3").igual(Fraccion.de(1, 3))).toBe(true);
    });

    it('"-2/3" -> -2/3', () => {
      expect(parsearFraccion("-2/3").igual(Fraccion.de(-2, 3))).toBe(true);
    });

    it('"0.125" -> 1/8', () => {
      expect(parsearFraccion("0.125").igual(Fraccion.de(1, 8))).toBe(true);
    });
  });

  describe("no pasa por Number para el resultado final", () => {
    it("parsea un número decimal mayor al límite seguro de Number sin perder precisión", () => {
      // 12345678901234567.5 no es representable exactamente como number (float64),
      // pero sí como Fraccion exacta (bigint). Esto solo funciona si el parseo
      // nunca pasa el valor final por Number()/parseFloat.
      const f = parsearFraccion("12345678901234567.5");
      expect(f.den).toBe(2n);
      expect(f.num).toBe(24691357802469135n);
    });
  });

  describe("entradas inválidas", () => {
    it("lanza ErrorTextoInvalido para texto vacío", () => {
      expect(() => parsearFraccion("")).toThrow(ErrorTextoInvalido);
    });

    it("lanza ErrorTextoInvalido para texto no numérico", () => {
      expect(() => parsearFraccion("abc")).toThrow(ErrorTextoInvalido);
    });

    it("lanza ErrorTextoInvalido para separadores de miles", () => {
      expect(() => parsearFraccion("10.000.000")).toThrow(ErrorTextoInvalido);
    });

    it("lanza ErrorTextoInvalido para formato de fracción incompleto", () => {
      expect(() => parsearFraccion("1/")).toThrow(ErrorTextoInvalido);
      expect(() => parsearFraccion("/3")).toThrow(ErrorTextoInvalido);
    });

    it("lanza ErrorDivisionPorCero para fracción con denominador 0", () => {
      expect(() => parsearFraccion("1/0")).toThrow(ErrorDivisionPorCero);
    });
  });
});
