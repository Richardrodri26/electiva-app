import { describe, expect, it } from "vitest";
import { ErrorDivisionPorCero, ErrorNumeroNoSeguro, Fraccion } from "./fraccion";

describe("Fraccion", () => {
  describe("normalización", () => {
    it("reduce 2/4 a 1/2", () => {
      const f = Fraccion.de(2, 4);
      expect(f.num).toBe(1n);
      expect(f.den).toBe(2n);
    });

    it("normaliza 1/-2 a -1/2 (denominador siempre positivo)", () => {
      const f = Fraccion.de(1, -2);
      expect(f.num).toBe(-1n);
      expect(f.den).toBe(2n);
    });

    it("representa el cero siempre como 0/1", () => {
      expect(Fraccion.de(0, 5).num).toBe(0n);
      expect(Fraccion.de(0, 5).den).toBe(1n);
      expect(Fraccion.de(0, -7).den).toBe(1n);
    });

    it("de(n) sin denominador construye n/1", () => {
      const f = Fraccion.de(5);
      expect(f.num).toBe(5n);
      expect(f.den).toBe(1n);
    });

    it("acepta bigint directamente", () => {
      const f = Fraccion.de(10n, 4n);
      expect(f.num).toBe(5n);
      expect(f.den).toBe(2n);
    });

    it("rechaza number que no es entero seguro", () => {
      expect(() => Fraccion.de(1.5)).toThrow(ErrorNumeroNoSeguro);
      expect(() => Fraccion.de(Number.MAX_SAFE_INTEGER + 1)).toThrow(ErrorNumeroNoSeguro);
    });

    it("lanza ErrorDivisionPorCero al construir con denominador 0", () => {
      expect(() => Fraccion.de(3, 0)).toThrow(ErrorDivisionPorCero);
    });
  });

  describe("operaciones", () => {
    it("suma", () => {
      expect(Fraccion.de(1, 2).sumar(Fraccion.de(1, 3)).igual(Fraccion.de(5, 6))).toBe(true);
    });

    it("resta", () => {
      expect(Fraccion.de(1, 2).restar(Fraccion.de(1, 3)).igual(Fraccion.de(1, 6))).toBe(true);
    });

    it("multiplica", () => {
      expect(Fraccion.de(2, 3).multiplicar(Fraccion.de(3, 4)).igual(Fraccion.de(1, 2))).toBe(true);
    });

    it("divide", () => {
      expect(Fraccion.de(2, 3).dividir(Fraccion.de(4, 5)).igual(Fraccion.de(5, 6))).toBe(true);
    });

    it("dividir por cero lanza ErrorDivisionPorCero", () => {
      expect(() => Fraccion.de(1, 2).dividir(Fraccion.CERO)).toThrow(ErrorDivisionPorCero);
    });

    it("niega", () => {
      expect(Fraccion.de(3, 4).negar().igual(Fraccion.de(-3, 4))).toBe(true);
      expect(Fraccion.de(-3, 4).negar().igual(Fraccion.de(3, 4))).toBe(true);
    });

    it("valor absoluto", () => {
      expect(Fraccion.de(-3, 4).abs().igual(Fraccion.de(3, 4))).toBe(true);
      expect(Fraccion.de(3, 4).abs().igual(Fraccion.de(3, 4))).toBe(true);
    });
  });

  describe("comparación", () => {
    it("comparar devuelve -1, 0, 1", () => {
      expect(Fraccion.de(1, 2).comparar(Fraccion.de(2, 3))).toBe(-1);
      expect(Fraccion.de(2, 3).comparar(Fraccion.de(1, 2))).toBe(1);
      expect(Fraccion.de(1, 2).comparar(Fraccion.de(2, 4))).toBe(0);
    });

    it("igual compara valor, no representación original", () => {
      expect(Fraccion.de(2, 4).igual(Fraccion.de(1, 2))).toBe(true);
      expect(Fraccion.de(1, 2).igual(Fraccion.de(1, 3))).toBe(false);
    });

    it("esCero, esPositiva, esNegativa, esEntera", () => {
      expect(Fraccion.CERO.esCero()).toBe(true);
      expect(Fraccion.de(3, 4).esPositiva()).toBe(true);
      expect(Fraccion.de(-3, 4).esNegativa()).toBe(true);
      expect(Fraccion.de(4, 2).esEntera()).toBe(true);
      expect(Fraccion.de(3, 4).esEntera()).toBe(false);
    });
  });

  describe("formato de texto", () => {
    it("aTexto de fracción propia", () => {
      expect(Fraccion.de(31, 4).aTexto()).toBe("31/4");
    });

    it("aTexto de entero negativo", () => {
      expect(Fraccion.de(-3).aTexto()).toBe("-3");
    });

    it("aTexto de cero", () => {
      expect(Fraccion.CERO.aTexto()).toBe("0");
    });
  });

  describe("aDecimal (redondeo half-up, sin ceros sobrantes)", () => {
    it("31/4 -> 7.75", () => {
      expect(Fraccion.de(31, 4).aDecimal()).toBe("7.75");
    });

    it("8/3 -> 2.6667 (redondeo half-up a 4 decimales)", () => {
      expect(Fraccion.de(8, 3).aDecimal()).toBe("2.6667");
    });

    it("1/2 -> 0.5 (quita ceros sobrantes)", () => {
      expect(Fraccion.de(1, 2).aDecimal()).toBe("0.5");
    });

    it("-3/4 -> -0.75 (negativo)", () => {
      expect(Fraccion.de(-3, 4).aDecimal()).toBe("-0.75");
    });

    it("0 -> 0", () => {
      expect(Fraccion.CERO.aDecimal()).toBe("0");
    });

    it("entero exacto no muestra decimales", () => {
      expect(Fraccion.de(8, 2).aDecimal()).toBe("4");
    });

    it("acarreo de redondeo hacia la parte entera", () => {
      // 99999/100000 con 4 decimales redondea a 1.0000 -> "1"
      expect(Fraccion.de(99999, 100000).aDecimal(4)).toBe("1");
    });

    it("respeta la cantidad de decimales pedida", () => {
      expect(Fraccion.de(1, 3).aDecimal(2)).toBe("0.33");
    });
  });

  describe("aNumero", () => {
    it("convierte a number (solo para graficar)", () => {
      expect(Fraccion.de(1, 2).aNumero()).toBeCloseTo(0.5);
      expect(Fraccion.de(-3, 4).aNumero()).toBeCloseTo(-0.75);
    });
  });
});
