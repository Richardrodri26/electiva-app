import { describe, expect, it } from "vitest";
import type { ModeloLineal, Variable } from "./tipos";
import {
  formatearCondicionesTexto,
  formatearExpresionTexto,
  formatearFuncionObjetivoTexto,
  formatearModeloTexto,
  formatearResumenTexto,
  formatearRestriccionesTexto,
  formatearVariablesTexto,
  generarTokensExpresion,
  generarTokensRestriccion,
} from "./formato";

const X1: Variable = { nombre: "x1", etiqueta: "x1", definicion: "x1 = variable de decisión 1." };
const X2: Variable = { nombre: "x2", etiqueta: "x2", definicion: "x2 = variable de decisión 2." };

/** Modelo de la Prueba 1 del encargo: sillas/mesas, idéntico al caso del CLI. */
const MODELO_SILLAS_MESAS: ModeloLineal = {
  version: 1,
  origen: "editor",
  naturaleza: "entera",
  variables: [
    { nombre: "x1", etiqueta: "Sillas", definicion: "x1 = cantidad de Sillas que se producirán." },
    { nombre: "x2", etiqueta: "Mesas", definicion: "x2 = cantidad de Mesas que se producirán." },
  ],
  objetivo: { sentido: "max", coeficientes: ["40000", "60000"], simbolo: "Z" },
  restricciones: [
    { numero: 1, nombre: "Madera disponible", coeficientes: ["4", "8"], relacion: "<=", limite: "100" },
    { numero: 2, nombre: "Horas", coeficientes: ["2", "3"], relacion: "<=", limite: "90" },
  ],
};

describe("formatearExpresionTexto — reglas de término", () => {
  it("coeficientes normales: 3x1 + 2x2", () => {
    expect(formatearExpresionTexto(["3", "2"], [X1, X2])).toBe("3x1 + 2x2");
  });

  it("coeficiente -1 implícito: x1 - x2", () => {
    expect(formatearExpresionTexto(["1", "-1"], [X1, X2])).toBe("x1 - x2");
  });

  it("coeficiente fraccionario: 2/3x1", () => {
    expect(formatearExpresionTexto(["2/3"], [X1])).toBe("2/3x1");
  });

  it("coeficiente fraccionario en decimal: 0.6667x1", () => {
    expect(formatearExpresionTexto(["2/3"], [X1], "decimal")).toBe("0.6667x1");
  });

  it("todos los términos en cero: 0", () => {
    expect(formatearExpresionTexto(["0", "0"], [X1, X2])).toBe("0");
  });

  it("términos en cero intermedios se omiten (no 0x2)", () => {
    expect(formatearExpresionTexto(["3", "0", "2"], [X1, X2, { ...X1, nombre: "x3" }])).toBe("3x1 + 2x3");
  });

  it("coeficiente 1 implícito al inicio y -1 implícito después: x1 - x2", () => {
    expect(formatearExpresionTexto(["1", "-1"], [X1, X2])).toBe("x1 - x2");
  });

  it("primer término negativo no fraccionario: -x1 + 2x2", () => {
    expect(formatearExpresionTexto(["-1", "2"], [X1, X2])).toBe("-x1 + 2x2");
  });
});

describe("generarTokensExpresion — signo menos tipográfico (U+2212) para la UI", () => {
  it("x1 − x2 con − tipográfico", () => {
    expect(generarTokensExpresion(["1", "-1"], [X1, X2])).toEqual([
      { tipo: "var", texto: "x1" },
      { tipo: "op", texto: " − " },
      { tipo: "var", texto: "x2" },
    ]);
  });

  it("3x1 + 2x2", () => {
    expect(generarTokensExpresion(["3", "2"], [X1, X2])).toEqual([
      { tipo: "coef", texto: "3" },
      { tipo: "var", texto: "x1" },
      { tipo: "op", texto: " + " },
      { tipo: "coef", texto: "2" },
      { tipo: "var", texto: "x2" },
    ]);
  });

  it("todo-cero -> un único token coef '0'", () => {
    expect(generarTokensExpresion(["0", "0"], [X1, X2])).toEqual([{ tipo: "coef", texto: "0" }]);
  });
});

describe("generarTokensRestriccion", () => {
  it("agrega relación (≤) y límite como tokens, en fracción", () => {
    expect(generarTokensRestriccion(["4", "8"], [X1, X2], "<=", "100")).toEqual([
      { tipo: "coef", texto: "4" },
      { tipo: "var", texto: "x1" },
      { tipo: "op", texto: " + " },
      { tipo: "coef", texto: "8" },
      { tipo: "var", texto: "x2" },
      { tipo: "rel", texto: " ≤ " },
      { tipo: "num", texto: "100" },
    ]);
  });
});

describe("formatearModeloTexto — Prueba 1 (sillas/mesas), estructura del CLI con formato de docs/03", () => {
  it("reproduce la salida esperada", () => {
    const esperado = [
      "MODELO GENERADO",
      "",
      "Variables de decisión:",
      "x1 = cantidad de Sillas que se producirán.",
      "x2 = cantidad de Mesas que se producirán.",
      "",
      "Función objetivo:",
      "Maximizar Z = 40000x1 + 60000x2",
      "",
      "Restricciones:",
      "1. Madera disponible: 4x1 + 8x2 <= 100",
      "2. Horas: 2x1 + 3x2 <= 90",
      "",
      "Condiciones:",
      "x1, x2 son números enteros no negativos.",
    ].join("\n");

    expect(formatearModeloTexto(MODELO_SILLAS_MESAS)).toBe(esperado);
  });

  it("formatearResumenTexto usa el mismo cuerpo con otro encabezado", () => {
    const resumen = formatearResumenTexto(MODELO_SILLAS_MESAS);
    expect(resumen.startsWith("RESUMEN DE LOS DATOS CAPTURADOS\n\n")).toBe(true);
    expect(resumen.endsWith(formatearModeloTexto(MODELO_SILLAS_MESAS).slice("MODELO GENERADO\n\n".length))).toBe(
      true,
    );
  });
});

describe("piezas individuales del cuerpo", () => {
  it("formatearVariablesTexto", () => {
    expect(formatearVariablesTexto(MODELO_SILLAS_MESAS)).toEqual([
      "x1 = cantidad de Sillas que se producirán.",
      "x2 = cantidad de Mesas que se producirán.",
    ]);
  });

  it("formatearFuncionObjetivoTexto", () => {
    expect(formatearFuncionObjetivoTexto(MODELO_SILLAS_MESAS)).toBe("Maximizar Z = 40000x1 + 60000x2");
  });

  it("formatearRestriccionesTexto", () => {
    expect(formatearRestriccionesTexto(MODELO_SILLAS_MESAS)).toEqual([
      "1. Madera disponible: 4x1 + 8x2 <= 100",
      "2. Horas: 2x1 + 3x2 <= 90",
    ]);
  });

  it("formatearCondicionesTexto — entera", () => {
    expect(formatearCondicionesTexto(MODELO_SILLAS_MESAS)).toBe("x1, x2 son números enteros no negativos.");
  });

  it("formatearCondicionesTexto — fraccionaria", () => {
    expect(formatearCondicionesTexto({ ...MODELO_SILLAS_MESAS, naturaleza: "fraccionaria" })).toBe("x1, x2 >= 0.");
  });
});
