import { describe, expect, it } from "vitest";

import { esTeclaManejada, idCeldaCoeficiente, siguienteCeldaParaTecla } from "./navegacion-grilla";

const LIMITES = { totalFilas: 2, totalColumnas: 3 }; // objetivo + 2 restricciones, 3 variables
const CARET_SIN_SELECCION = { alInicio: false, alFinal: false };
const CARET_AL_INICIO = { alInicio: true, alFinal: false };
const CARET_AL_FINAL = { alInicio: false, alFinal: true };

describe("navegación de la grilla — esTeclaManejada", () => {
  it("reconoce las 5 teclas manejadas y ninguna otra", () => {
    expect(esTeclaManejada("ArrowUp")).toBe(true);
    expect(esTeclaManejada("ArrowDown")).toBe(true);
    expect(esTeclaManejada("ArrowLeft")).toBe(true);
    expect(esTeclaManejada("ArrowRight")).toBe(true);
    expect(esTeclaManejada("Enter")).toBe(true);
    expect(esTeclaManejada("Tab")).toBe(false);
    expect(esTeclaManejada("a")).toBe(false);
  });
});

describe("navegación de la grilla — siguienteCeldaParaTecla", () => {
  it("ArrowUp sube una fila, salvo en la fila del objetivo (0)", () => {
    expect(siguienteCeldaParaTecla("ArrowUp", { fila: 1, columna: 0 }, LIMITES, CARET_SIN_SELECCION)).toEqual({
      fila: 0,
      columna: 0,
    });
    expect(siguienteCeldaParaTecla("ArrowUp", { fila: 0, columna: 0 }, LIMITES, CARET_SIN_SELECCION)).toBeNull();
  });

  it("ArrowDown baja una fila, salvo en la última restricción", () => {
    expect(siguienteCeldaParaTecla("ArrowDown", { fila: 0, columna: 0 }, LIMITES, CARET_SIN_SELECCION)).toEqual({
      fila: 1,
      columna: 0,
    });
    expect(siguienteCeldaParaTecla("ArrowDown", { fila: 2, columna: 0 }, LIMITES, CARET_SIN_SELECCION)).toBeNull();
  });

  it("Enter se comporta como ArrowDown (baja una fila, nada en la última)", () => {
    expect(siguienteCeldaParaTecla("Enter", { fila: 0, columna: 1 }, LIMITES, CARET_SIN_SELECCION)).toEqual({
      fila: 1,
      columna: 1,
    });
    expect(siguienteCeldaParaTecla("Enter", { fila: 2, columna: 1 }, LIMITES, CARET_SIN_SELECCION)).toBeNull();
  });

  it("ArrowLeft solo mueve de columna si el cursor está al inicio del texto", () => {
    expect(siguienteCeldaParaTecla("ArrowLeft", { fila: 0, columna: 1 }, LIMITES, CARET_AL_INICIO)).toEqual({
      fila: 0,
      columna: 0,
    });
    expect(siguienteCeldaParaTecla("ArrowLeft", { fila: 0, columna: 1 }, LIMITES, CARET_SIN_SELECCION)).toBeNull();
  });

  it("ArrowLeft no hace nada en la primera columna, aunque el cursor esté al inicio", () => {
    expect(siguienteCeldaParaTecla("ArrowLeft", { fila: 0, columna: 0 }, LIMITES, CARET_AL_INICIO)).toBeNull();
  });

  it("ArrowRight solo mueve de columna si el cursor está al final del texto", () => {
    expect(siguienteCeldaParaTecla("ArrowRight", { fila: 0, columna: 1 }, LIMITES, CARET_AL_FINAL)).toEqual({
      fila: 0,
      columna: 2,
    });
    expect(siguienteCeldaParaTecla("ArrowRight", { fila: 0, columna: 1 }, LIMITES, CARET_SIN_SELECCION)).toBeNull();
  });

  it("ArrowRight no hace nada en la última columna, aunque el cursor esté al final", () => {
    expect(siguienteCeldaParaTecla("ArrowRight", { fila: 0, columna: 2 }, LIMITES, CARET_AL_FINAL)).toBeNull();
  });
});

describe("navegación de la grilla — idCeldaCoeficiente", () => {
  it("genera un id estable y distinto por fila/columna", () => {
    expect(idCeldaCoeficiente(0, 0)).toBe("celda-coef-0-0");
    expect(idCeldaCoeficiente(2, 1)).toBe("celda-coef-2-1");
    expect(idCeldaCoeficiente(0, 0)).not.toBe(idCeldaCoeficiente(1, 0));
  });
});
