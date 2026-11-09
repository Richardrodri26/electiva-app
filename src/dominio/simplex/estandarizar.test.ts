import { describe, expect, it } from "vitest";
import { C1, C5, C6, C11, C12 } from "../__fixtures__/casos";
import { estandarizar } from "./estandarizar";

/** Formatea la fila Z (ValorM[]) como array de strings, para comparar con los fixtures. */
function filaZTexto(filaZ: { aTexto(): string }[]): string[] {
  return filaZ.map((v) => v.aTexto());
}

describe("estandarizar", () => {
  describe("§2.1 normalización de límites negativos", () => {
    it("C1: normaliza R2 (-3x1+2x2 >= -18) a 3x1-2x2 <= 18", () => {
      const { preparacion } = estandarizar(C1.modelo);
      const paso = preparacion.find((p) => p.tipo === "normalizar_limite");
      expect(paso).toBeDefined();
      if (paso?.tipo !== "normalizar_limite") throw new Error("tipo inesperado");
      expect(paso.restriccionNumero).toBe(2);
      expect(paso.relacionOriginal).toBe(">=");
      expect(paso.limiteOriginal.aTexto()).toBe("-18");
      expect(paso.relacionNormalizada).toBe("<=");
      expect(paso.limiteNormalizado.aTexto()).toBe("18");
      expect(paso.coeficientesNormalizados.map((c) => c.aTexto())).toEqual(["3", "-2"]);
    });

    it("C12: normaliza R1 (-x1-x2 = -4) a x1+x2 = 4, relación = se mantiene", () => {
      const { preparacion } = estandarizar(C12.modelo);
      const paso = preparacion.find((p) => p.tipo === "normalizar_limite");
      expect(paso).toBeDefined();
      if (paso?.tipo !== "normalizar_limite") throw new Error("tipo inesperado");
      expect(paso.restriccionNumero).toBe(1);
      expect(paso.relacionOriginal).toBe("=");
      expect(paso.relacionNormalizada).toBe("=");
      expect(paso.limiteOriginal.aTexto()).toBe("-4");
      expect(paso.limiteNormalizado.aTexto()).toBe("4");
      expect(paso.coeficientesNormalizados.map((c) => c.aTexto())).toEqual(["1", "1"]);
    });

    it("no registra el paso cuando no hay límites negativos", () => {
      const { preparacion } = estandarizar(C6.modelo);
      expect(preparacion.some((p) => p.tipo === "normalizar_limite")).toBe(false);
    });
  });

  describe("§2.2/§2.3 variables agregadas y orden de columnas", () => {
    it("C6 (= y <=): columnas x1 x2 S2 A1, básica inicial A1 y S2", () => {
      const { columnas, tablaInicial } = estandarizar(C6.modelo);
      expect(columnas.map((c) => c.id)).toEqual(["x1", "x2", "S2", "A1"]);
      expect(columnas.find((c) => c.id === "S2")?.tipo).toBe("holgura");
      expect(columnas.find((c) => c.id === "A1")?.tipo).toBe("artificial");
      expect(tablaInicial.base).toEqual(["A1", "S2"]);
    });

    it("C5 (dos >=): columnas x1 x2 S1 S2 A1 A2, básicas A1 y A2 (exceso S resta)", () => {
      const { columnas, tablaInicial } = estandarizar(C5.modelo);
      expect(columnas.map((c) => c.id)).toEqual(["x1", "x2", "S1", "S2", "A1", "A2"]);
      expect(columnas.find((c) => c.id === "S1")?.tipo).toBe("exceso");
      expect(tablaInicial.base).toEqual(["A1", "A2"]);
      // S1 entra con coeficiente -1 en su propia fila (exceso).
      const idxS1 = columnas.findIndex((c) => c.id === "S1");
      expect(tablaInicial.filas[0]![idxS1]!.aTexto()).toBe("-1");
    });

    it("C11 (mixto >=, <=, =): columnas x1 x2 x3 S1 S2 A1 A3, orden de S y A por restricción", () => {
      const { columnas, tablaInicial } = estandarizar(C11.modelo);
      expect(columnas.map((c) => c.id)).toEqual(["x1", "x2", "x3", "S1", "S2", "A1", "A3"]);
      expect(tablaInicial.base).toEqual(["A1", "S2", "A3"]);
    });
  });

  describe("§2.4/§2.5 fila Z canónica y ajuste de M", () => {
    it("C5: fila Z inicial y tras el ajuste de M coinciden con docs/08", () => {
      const { preparacion, tablaInicial } = estandarizar(C5.modelo);
      const ajuste = preparacion.find((p) => p.tipo === "ajuste_m");
      expect(ajuste).toBeDefined();
      if (ajuste?.tipo !== "ajuste_m") throw new Error("tipo inesperado");

      expect(filaZTexto(ajuste.filaZAntes)).toEqual(C5.zInicial!.slice(0, -1));
      expect(filaZTexto(ajuste.filaZDespues)).toEqual(C5.zAjustada!.slice(0, -1));
      expect(tablaInicial.filaZ.map((v) => v.aTexto())).toEqual(C5.zAjustada!.slice(0, -1));
      expect(tablaInicial.valorZ.aTexto()).toBe(C5.zAjustada!.at(-1));
    });

    it("C12: fila Z tras el ajuste de M coincide con docs/08 (incluye empate de entrada)", () => {
      const { tablaInicial } = estandarizar(C12.modelo);
      expect(tablaInicial.filaZ.map((v) => v.aTexto())).toEqual(C12.zAjustada!.slice(0, -1));
      expect(tablaInicial.valorZ.aTexto()).toBe(C12.zAjustada!.at(-1));
    });
  });

  describe("forma estándar: toda fracción queda normalizada", () => {
    it("ninguna fracción de la tabla inicial tiene mcd(|num|, den) != 1", () => {
      function mcd(a: bigint, b: bigint): bigint {
        let x = a < 0n ? -a : a;
        let y = b < 0n ? -b : b;
        while (y !== 0n) {
          const r = x % y;
          x = y;
          y = r;
        }
        return x;
      }
      for (const caso of [C1, C5, C6, C11, C12]) {
        const { tablaInicial } = estandarizar(caso.modelo);
        for (const fila of tablaInicial.filas) {
          for (const f of fila) {
            expect(mcd(f.num, f.den)).toBe(1n);
            expect(f.den > 0n).toBe(true);
          }
        }
        for (const r of tablaInicial.ladoDerecho) {
          expect(mcd(r.num, r.den)).toBe(1n);
        }
      }
    });
  });
});
