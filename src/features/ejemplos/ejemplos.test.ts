import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { C1, C2, C3, C4 } from "@/dominio/__fixtures__/casos";
import { esquemaModelo } from "@/dominio/modelo/esquemas";

import { parsearEjemplos } from "./ejemplos";

const rutaJson = new URL("../../../public/ejemplos.json", import.meta.url);
const datosJson: unknown = JSON.parse(readFileSync(rutaJson, "utf8"));

describe("public/ejemplos.json", () => {
  it("contiene los 4 ejemplos de clase y todos validan", () => {
    const ejemplos = parsearEjemplos(datosJson);

    expect(ejemplos.map((ejemplo) => ejemplo.id)).toEqual([
      "clase-principal",
      "actividad-clase",
      "compromiso",
      "ejercicio-2",
    ]);
    for (const ejemplo of ejemplos) {
      expect(esquemaModelo.safeParse(ejemplo.modelo).success).toBe(true);
    }
  });

  it("coincide con los fixtures C1..C4 (modelo y título)", () => {
    const ejemplos = parsearEjemplos(datosJson);
    const esperados = [
      { caso: C1, id: "clase-principal" },
      { caso: C2, id: "actividad-clase" },
      { caso: C3, id: "compromiso" },
      { caso: C4, id: "ejercicio-2" },
    ];

    for (const { caso, id } of esperados) {
      const ejemplo = ejemplos.find((e) => e.id === id);
      expect(ejemplo, id).toBeDefined();
      expect(ejemplo?.titulo).toBe(caso.titulo);
      expect(ejemplo?.modelo).toEqual(caso.modelo);
    }
  });

  it("rechaza un modelo inválido en lugar de descartarlo", () => {
    const copia = structuredClone(datosJson) as Array<{ modelo: { restricciones: Array<{ limite: string }> } }>;
    copia[0]!.modelo.restricciones[0]!.limite = "abc";

    expect(() => parsearEjemplos(copia)).toThrow();
  });
});
