import { describe, expect, it } from "vitest";
import { Fraccion } from "./fraccion";
import { ValorM } from "./valor-m";

function v(a: number, b = 0): ValorM {
  return new ValorM(Fraccion.de(a), Fraccion.de(b));
}

describe("ValorM", () => {
  describe("orden", () => {
    it("compara primero b (coeficiente de M) y luego a", () => {
      const menosM = new ValorM(Fraccion.CERO, Fraccion.de(-1));
      const menos1000 = v(-1000);
      const cero = v(0);
      const tres = v(3);
      const mMenos100 = new ValorM(Fraccion.de(-100), Fraccion.de(1));

      // -M < -1000 < 0 < 3 < M - 100
      expect(menosM.comparar(menos1000)).toBe(-1);
      expect(menos1000.comparar(cero)).toBe(-1);
      expect(cero.comparar(tres)).toBe(-1);
      expect(tres.comparar(mMenos100)).toBe(-1);

      expect(mMenos100.comparar(tres)).toBe(1);
      expect(cero.comparar(cero)).toBe(0);
    });
  });

  describe("esNegativo", () => {
    it("es negativo si b < 0", () => {
      expect(new ValorM(Fraccion.de(1000), Fraccion.de(-1)).esNegativo()).toBe(true);
    });

    it("es negativo si b = 0 y a < 0", () => {
      expect(v(-5).esNegativo()).toBe(true);
    });

    it("no es negativo si b > 0, sin importar a", () => {
      expect(new ValorM(Fraccion.de(-1000), Fraccion.de(1)).esNegativo()).toBe(false);
    });

    it("no es negativo si b = 0 y a >= 0", () => {
      expect(v(0).esNegativo()).toBe(false);
      expect(v(5).esNegativo()).toBe(false);
    });
  });

  describe("operaciones", () => {
    it("sumar", () => {
      const r = v(2, 3).sumar(v(1, -1));
      expect(r.a.igual(Fraccion.de(3))).toBe(true);
      expect(r.b.igual(Fraccion.de(2))).toBe(true);
    });

    it("restar", () => {
      const r = v(2, 3).restar(v(1, 1));
      expect(r.a.igual(Fraccion.de(1))).toBe(true);
      expect(r.b.igual(Fraccion.de(2))).toBe(true);
    });

    it("multiplicarPor", () => {
      const r = v(2, 3).multiplicarPor(Fraccion.de(2));
      expect(r.a.igual(Fraccion.de(4))).toBe(true);
      expect(r.b.igual(Fraccion.de(6))).toBe(true);
    });
  });

  describe("formato de texto", () => {
    it("solo constante: \"3\"", () => {
      expect(v(3).aTexto()).toBe("3");
    });

    it("coeficiente 1 implícito: \"M\"", () => {
      expect(new ValorM(Fraccion.CERO, Fraccion.de(1)).aTexto()).toBe("M");
    });

    it("coeficiente -1: \"-M\"", () => {
      expect(new ValorM(Fraccion.CERO, Fraccion.de(-1)).aTexto()).toBe("-M");
    });

    it("ambos términos, b negativo: \"2 - 3M\"", () => {
      expect(new ValorM(Fraccion.de(2), Fraccion.de(-3)).aTexto()).toBe("2 - 3M");
    });

    it("ambos términos, b positivo con coeficiente 1: \"-4 + M\"", () => {
      expect(new ValorM(Fraccion.de(-4), Fraccion.de(1)).aTexto()).toBe("-4 + M");
    });

    it("término nulo se omite: \"0\"", () => {
      expect(new ValorM(Fraccion.CERO, Fraccion.CERO).aTexto()).toBe("0");
    });
  });
});
