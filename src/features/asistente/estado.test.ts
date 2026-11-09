import { describe, expect, it } from "vitest";

import type { ModeloLineal } from "@/dominio/modelo/tipos";

import {
  construirModeloDesdeAsistente,
  crearBorradorAsistente,
  crearCoeficientesVacios,
  crearRestriccionVacia,
  validarPaso1,
  validarPaso2,
  validarPaso3,
  validarPaso4,
  type BorradorAsistente,
} from "./estado";

/**
 * Prueba 1 del CLI (ver prompt de la tarea T5.1): categoría Productos, 2 opciones
 * "Sillas"/"Mesas", unidad Unidades, meta "Mayor utilidad" (aportes 40000/60000),
 * dos limitaciones — "Madera disponible" (tipo "Otra", 4/8, límite 100) y "Horas"
 * (catálogo, 2/3, límite 90) — ambas "No se puede superar", naturaleza enteras.
 *
 * NOTA (ambigüedad real, ver resumen final): la tarea pide verificar este resultado
 * "contra C1 en src/dominio/__fixtures__/casos.ts", pero C1 (docs/08-casos-de-prueba.md)
 * es un modelo numéricamente distinto (objetivo 3x1+2x2, otras restricciones y límites,
 * naturaleza fraccionaria): no corresponde a esta "Prueba 1" más allá de la FORMA del
 * `ModeloLineal` (2 variables, origen asistente). Este test construye el `ModeloLineal`
 * esperado directamente a partir de los datos literales de la Prueba 1, no desde C1.
 */
function borradorPrueba1(): BorradorAsistente {
  const borrador = crearBorradorAsistente();

  borrador.paso1.categoria = 1; // Productos
  borrador.paso1.nombresOpciones = ["Sillas", "Mesas"];
  borrador.paso1.unidadId = 1; // Unidades

  borrador.paso2.meta = 1; // Mayor utilidad -> sentido 'max'
  borrador.paso2.coeficientes = ["40000", "60000"];

  const madera = crearRestriccionVacia(2);
  madera.tipo = 8; // Otra
  madera.nombrePersonalizado = "Madera disponible";
  madera.coeficientes = ["4", "8"];
  madera.limite = "100";
  madera.formaCumplimiento = 1; // No se puede superar

  const horas = crearRestriccionVacia(2);
  horas.tipo = 2; // Horas (catálogo)
  horas.coeficientes = ["2", "3"];
  horas.limite = "90";
  horas.formaCumplimiento = 1; // No se puede superar

  borrador.paso3.restricciones = [madera, horas];

  borrador.paso4.naturaleza = 1; // enteras

  return borrador;
}

const MODELO_ESPERADO_PRUEBA_1: ModeloLineal = {
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

describe("asistente — Prueba 1 (Sillas/Mesas)", () => {
  it("valida cada paso de forma independiente, en orden", () => {
    const borrador = borradorPrueba1();

    const resultadoPaso1 = validarPaso1(borrador.paso1);
    expect(resultadoPaso1.success).toBe(true);
    if (resultadoPaso1.success) {
      expect(resultadoPaso1.data).toEqual({
        categoria: 1,
        unidad: "Unidades",
        nombresOpciones: ["Sillas", "Mesas"],
      });
    }

    const resultadoPaso2 = validarPaso2(borrador.paso2);
    expect(resultadoPaso2.success).toBe(true);
    if (resultadoPaso2.success) {
      expect(resultadoPaso2.data).toEqual({ meta: 1, coeficientes: ["40000", "60000"] });
    }

    const resultadoPaso3 = validarPaso3(borrador.paso3);
    expect(resultadoPaso3.success).toBe(true);
    if (resultadoPaso3.success) {
      expect(resultadoPaso3.data.restricciones).toEqual([
        { tipo: 8, nombrePersonalizado: "Madera disponible", coeficientes: ["4", "8"], limite: "100", formaCumplimiento: 1 },
        { tipo: 2, nombrePersonalizado: undefined, coeficientes: ["2", "3"], limite: "90", formaCumplimiento: 1 },
      ]);
    }

    const resultadoPaso4 = validarPaso4(borrador.paso4);
    expect(resultadoPaso4.success).toBe(true);
    if (resultadoPaso4.success) {
      expect(resultadoPaso4.data).toEqual({ naturaleza: "entera" });
    }
  });

  it("completando los 4 pasos llega al mismo ModeloLineal que la Prueba 1 del CLI", () => {
    const resultado = construirModeloDesdeAsistente(borradorPrueba1());

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.modelo).toEqual(MODELO_ESPERADO_PRUEBA_1);
    }
  });

  it("el modelo resultante difiere de C1 (no son el mismo caso, solo comparten la forma)", async () => {
    const { C1 } = await import("@/dominio/__fixtures__/casos");
    const resultado = construirModeloDesdeAsistente(borradorPrueba1());
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.modelo.objetivo.coeficientes).not.toEqual(C1.modelo.objetivo.coeficientes);
      expect(resultado.modelo.variables.map((v) => v.etiqueta)).not.toEqual(
        C1.modelo.variables.map((v) => v.etiqueta),
      );
    }
  });
});

describe("asistente — validaciones por paso", () => {
  it("paso 1: rechaza menos de 2 opciones y etiquetas duplicadas", () => {
    const borrador = crearBorradorAsistente();
    borrador.paso1.categoria = 1;
    borrador.paso1.nombresOpciones = ["Sillas"];
    expect(validarPaso1(borrador.paso1).success).toBe(false);

    borrador.paso1.nombresOpciones = ["Sillas", "sillas"];
    const resultado = validarPaso1(borrador.paso1);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((i) => i.message === "Ya existe una opción con ese nombre.")).toBe(true);
    }
  });

  it("paso 1: exige el texto de 'Otra' cuando se elige la unidad personalizada", () => {
    const borrador = crearBorradorAsistente();
    borrador.paso1.categoria = 1;
    borrador.paso1.nombresOpciones = ["Sillas", "Mesas"];
    borrador.paso1.unidadId = 6; // Otra
    borrador.paso1.unidadOtra = "";
    expect(validarPaso1(borrador.paso1).success).toBe(false);

    borrador.paso1.unidadOtra = "Kilos";
    const resultado = validarPaso1(borrador.paso1);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.unidad).toBe("Kilos");
    }
  });

  it("paso 2: aplica la regla meta<=3 -> max, meta>3 -> min, sin preguntarlo nunca", () => {
    const borrador = crearBorradorAsistente();
    borrador.paso2.meta = 1;
    borrador.paso2.coeficientes = ["1", "1"];
    const maximiza = construirModeloDesdeAsistenteValido(borrador);
    expect(maximiza?.objetivo.sentido).toBe("max");

    borrador.paso2.meta = 4;
    const minimiza = construirModeloDesdeAsistenteValido(borrador);
    expect(minimiza?.objetivo.sentido).toBe("min");
  });

  it("paso 3: rechaza una limitación que no usa ninguna opción, con el mensaje sin jerga", () => {
    const borrador = crearBorradorAsistente();
    borrador.paso3.restricciones = [{ ...crearRestriccionVacia(2), coeficientes: ["0", "0"], limite: "5" }];
    const resultado = validarPaso3(borrador.paso3);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((i) => i.message === "La limitación 1 no usa ninguna de las opciones.")).toBe(
        true,
      );
    }
  });

  it("paso 3: acepta entre 1 y 6 limitaciones", () => {
    const una = { restricciones: [crearRestriccionVacia(2)] };
    una.restricciones[0]!.limite = "5";
    una.restricciones[0]!.coeficientes = ["1", "1"];
    expect(validarPaso3(una).success).toBe(true);

    const siete = { restricciones: Array.from({ length: 7 }, () => crearRestriccionVacia(2)) };
    siete.restricciones.forEach((r) => {
      r.coeficientes = ["1", "1"];
      r.limite = "5";
    });
    expect(validarPaso3(siete).success).toBe(false);
  });

  it("paso 4: 1 -> entera, 2 -> fraccionaria", () => {
    expect(validarPaso4({ naturaleza: 1 })).toMatchObject({ success: true, data: { naturaleza: "entera" } });
    expect(validarPaso4({ naturaleza: 2 })).toMatchObject({ success: true, data: { naturaleza: "fraccionaria" } });
  });

  it("crearCoeficientesVacios devuelve la cantidad pedida de entradas vacías", () => {
    expect(crearCoeficientesVacios(3)).toEqual(["", "", ""]);
  });
});

function construirModeloDesdeAsistenteValido(borrador: BorradorAsistente) {
  borrador.paso1.categoria ??= 1;
  if (borrador.paso1.nombresOpciones.length === 0 || borrador.paso1.nombresOpciones.some((n) => n === "")) {
    borrador.paso1.nombresOpciones = ["Opción A", "Opción B"];
  }
  borrador.paso3.restricciones = [{ ...crearRestriccionVacia(2), coeficientes: ["1", "1"], limite: "10" }];
  const resultado = construirModeloDesdeAsistente(borrador);
  return resultado.ok ? resultado.modelo : null;
}
