import { describe, expect, it } from "vitest";

import { deserializarModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import { construirUrlResolver } from "./paso-5-revisar";

/** Mismo modelo que la "Prueba 1" (Sillas/Mesas) de `estado.test.ts`. */
const MODELO_PRUEBA_1: ModeloLineal = {
  version: 1,
  origen: "asistente",
  contexto: { categoria: 1, unidad: "Unidades" },
  variables: [
    { nombre: "x1", etiqueta: "Sillas", definicion: "x1 = cantidad de Sillas que se producirán." },
    { nombre: "x2", etiqueta: "Mesas", definicion: "x2 = cantidad de Mesas que se producirán." },
  ],
  objetivo: { sentido: "max", meta: 1, coeficientes: ["40000", "60000"], simbolo: "Z" },
  restricciones: [
    { numero: 1, nombre: "Madera disponible", coeficientes: ["4", "8"], relacion: "<=", limite: "100" },
    { numero: 2, nombre: "Horas", coeficientes: ["2", "3"], relacion: "<=", limite: "90" },
  ],
  naturaleza: "entera",
};

describe("Paso5Revisar — construirUrlResolver (acción 'Resolver modelo')", () => {
  it("genera /resolver?m=<serializado>&vista=modelo", () => {
    const url = construirUrlResolver(MODELO_PRUEBA_1);

    expect(url.startsWith("/resolver?m=")).toBe(true);
    expect(url.endsWith("&vista=modelo")).toBe(true);
  });

  it("el `m` de la URL deserializa exactamente al mismo ModeloLineal", () => {
    const url = construirUrlResolver(MODELO_PRUEBA_1);
    const serializado = url.slice("/resolver?m=".length, url.length - "&vista=modelo".length);

    const resultado = deserializarModelo(serializado);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor).toEqual(MODELO_PRUEBA_1);
    }
  });
});
