import { describe, expect, it } from "vitest";

import { MSG_NUMERO_EDITOR_INVALIDO } from "@/dominio/modelo/esquemas";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import {
  agregarRestriccion,
  agregarVariable,
  borradorDesdeModelo,
  construirModeloDesdeEditor,
  crearBorradorEditor,
  nombreRestriccionPorDefecto,
  puedeAgregarVariable,
  puedeQuitarVariable,
  quitarRestriccion,
  quitarVariable,
  tieneExactamenteDosVariables,
  validarEditor,
  type BorradorEditor,
} from "./estado";

describe("estado del editor — valores por defecto", () => {
  it("crea un borrador con 2 variables (x1, x2) y 1 restricción, todo vacío salvo los nombres", () => {
    const borrador = crearBorradorEditor();

    expect(borrador.variables).toEqual([
      { etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
      { etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
    ]);
    expect(borrador.coeficientesObjetivo).toEqual(["", ""]);
    expect(borrador.restricciones).toHaveLength(1);
    expect(borrador.restricciones[0]).toEqual({ nombre: "", coeficientes: ["", ""], relacion: "<=", limite: "" });
    expect(borrador.sentido).toBe("max");
    expect(borrador.naturaleza).toBe("fraccionaria");
  });
});

describe("estado del editor — agregar/quitar variables conserva el resto de los datos", () => {
  function borradorConDatos(): BorradorEditor {
    return {
      variables: [
        { etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
        { etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
      ],
      sentido: "max",
      coeficientesObjetivo: ["3", "2"],
      restricciones: [
        { nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=", limite: "35" },
        { nombre: "Madera", coeficientes: ["-3", "2"], relacion: ">=", limite: "-18" },
      ],
      naturaleza: "fraccionaria",
    };
  }

  it("agregarVariable agrega una columna vacía en el objetivo y en cada restricción, sin tocar lo existente", () => {
    const resultado = agregarVariable(borradorConDatos());

    expect(resultado.variables).toHaveLength(3);
    expect(resultado.variables[0]).toEqual({ etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." });
    expect(resultado.variables[1]).toEqual({ etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." });
    expect(resultado.variables[2]).toEqual({ etiqueta: "x3", definicion: "x3 = variable de decisión 3." });
    expect(resultado.coeficientesObjetivo).toEqual(["3", "2", ""]);
    expect(resultado.restricciones[0]).toEqual({ nombre: "Horas", coeficientes: ["2", "5", ""], relacion: "<=", limite: "35" });
    expect(resultado.restricciones[1]).toEqual({
      nombre: "Madera",
      coeficientes: ["-3", "2", ""],
      relacion: ">=",
      limite: "-18",
    });
  });

  it("quitarVariable quita la columna pedida y conserva las demás columnas y filas intactas", () => {
    // Se parte de 3 variables: con el mínimo (2) `quitarVariable` no hace nada (ver el test
    // de más abajo), así que para probar la quita real hay que estar por encima del mínimo.
    const conTresVariables = agregarVariable(borradorConDatos());
    const resultado = quitarVariable(conTresVariables, 0);

    expect(resultado.variables).toEqual([
      { etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
      { etiqueta: "x3", definicion: "x3 = variable de decisión 3." },
    ]);
    expect(resultado.coeficientesObjetivo).toEqual(["2", ""]);
    expect(resultado.restricciones[0]).toEqual({ nombre: "Horas", coeficientes: ["5", ""], relacion: "<=", limite: "35" });
    expect(resultado.restricciones[1]).toEqual({
      nombre: "Madera",
      coeficientes: ["2", ""],
      relacion: ">=",
      limite: "-18",
    });
  });

  it("no permite tener menos de 2 variables: quitarVariable no hace nada con exactamente 2", () => {
    const dosVariables: BorradorEditor = { ...borradorConDatos(), variables: borradorConDatos().variables.slice(0, 2) };
    expect(puedeQuitarVariable(dosVariables)).toBe(false);
    expect(quitarVariable(dosVariables, 0)).toBe(dosVariables);
  });

  it("no permite tener más de 6 variables: agregarVariable no hace nada con 6", () => {
    const seisVariables: BorradorEditor = {
      ...borradorConDatos(),
      variables: Array.from({ length: 6 }, (_, i) => ({ etiqueta: `x${i + 1}`, definicion: "" })),
      coeficientesObjetivo: Array.from({ length: 6 }, () => ""),
    };
    expect(puedeAgregarVariable(seisVariables)).toBe(false);
    expect(agregarVariable(seisVariables)).toBe(seisVariables);
  });

  it("agregarRestriccion agrega una fila vacía (sin nombre) con una columna por variable actual", () => {
    const resultado = agregarRestriccion(borradorConDatos());

    expect(resultado.restricciones).toHaveLength(3);
    expect(resultado.restricciones[2]).toEqual({ nombre: "", coeficientes: ["", ""], relacion: "<=", limite: "" });
    // Las filas existentes no se tocan.
    expect(resultado.restricciones[0]).toEqual(borradorConDatos().restricciones[0]);
    expect(resultado.restricciones[1]).toEqual(borradorConDatos().restricciones[1]);
  });

  it("quitarRestriccion quita la fila pedida y conserva las demás", () => {
    const resultado = quitarRestriccion(borradorConDatos(), 0);

    expect(resultado.restricciones).toEqual([
      { nombre: "Madera", coeficientes: ["-3", "2"], relacion: ">=", limite: "-18" },
    ]);
  });

  it("no permite quitar la última restricción (mínimo 1)", () => {
    const unaRestriccion: BorradorEditor = { ...borradorConDatos(), restricciones: [borradorConDatos().restricciones[0]!] };
    expect(quitarRestriccion(unaRestriccion, 0)).toBe(unaRestriccion);
  });
});

describe("estado del editor — habilitación de Método gráfico", () => {
  it("true solo con exactamente 2 variables", () => {
    const base = crearBorradorEditor();
    expect(tieneExactamenteDosVariables(base)).toBe(true);
    expect(tieneExactamenteDosVariables(agregarVariable(base))).toBe(false);
  });
});

describe("estado del editor — validarEditor acepta decimales y fracciones, rechaza texto inválido", () => {
  function borradorValido(): BorradorEditor {
    return {
      variables: [
        { etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
        { etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
      ],
      sentido: "max",
      coeficientesObjetivo: ["-3", "2,5"],
      restricciones: [{ nombre: "Horas", coeficientes: ["1/3", "2"], relacion: "<=", limite: "35" }],
      naturaleza: "fraccionaria",
    };
  }

  it("acepta -3, 2,5 y 1/3", () => {
    const resultado = validarEditor(borradorValido());
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.coeficientesObjetivo).toEqual(["-3", "2.5"]);
      expect(resultado.data.restricciones[0]?.coeficientes).toEqual(["1/3", "2"]);
    }
  });

  it("rechaza 'abc' con el mensaje de error de numeroEditor", () => {
    const borrador = borradorValido();
    borrador.coeficientesObjetivo[0] = "abc";

    const resultado = validarEditor(borrador);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => issue.message === MSG_NUMERO_EDITOR_INVALIDO)).toBe(true);
    }
  });

  it("completa el nombre de restricción vacío con el default y NO falla por eso", () => {
    const borrador = borradorValido();
    borrador.restricciones[0]!.nombre = "";

    const resultado = validarEditor(borrador);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.restricciones[0]?.nombre).toBe(nombreRestriccionPorDefecto(1));
    }
  });

  it("un nombre en blanco (solo espacios) también se completa con el default", () => {
    const borrador = borradorValido();
    borrador.restricciones[0]!.nombre = "   ";

    const resultado = validarEditor(borrador);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.restricciones[0]?.nombre).toBe(nombreRestriccionPorDefecto(1));
    }
  });
});

describe("estado del editor — construirModeloDesdeEditor", () => {
  it("ensambla un ModeloLineal con origen 'editor' a partir de un borrador válido", () => {
    const borrador: BorradorEditor = {
      variables: [
        { etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
        { etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
      ],
      sentido: "max",
      coeficientesObjetivo: ["3", "2"],
      restricciones: [{ nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=", limite: "35" }],
      naturaleza: "fraccionaria",
    };

    const resultado = construirModeloDesdeEditor(borrador);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.modelo.origen).toBe("editor");
      expect(resultado.modelo.variables[0]?.nombre).toBe("x1");
      expect(resultado.modelo.restricciones[0]?.numero).toBe(1);
    }
  });

  it("devuelve ok:false si el borrador no valida (restricción sin ninguna variable)", () => {
    const borrador: BorradorEditor = {
      variables: [
        { etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
        { etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
      ],
      sentido: "max",
      coeficientesObjetivo: ["1", "1"],
      restricciones: [{ nombre: "Horas", coeficientes: ["0", "0"], relacion: "<=", limite: "35" }],
      naturaleza: "fraccionaria",
    };

    const resultado = construirModeloDesdeEditor(borrador);
    expect(resultado.ok).toBe(false);
  });
});

describe("estado del editor — borradorDesdeModelo (carga inicial desde ?m= o un ejemplo)", () => {
  it("vuelve el ModeloLineal a la forma de borrador, 1 a 1", () => {
    const modelo: ModeloLineal = {
      version: 1,
      origen: "ejemplo",
      variables: [
        { nombre: "x1", etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
        { nombre: "x2", etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
      ],
      objetivo: { sentido: "max", coeficientes: ["3", "2"], simbolo: "Z" },
      restricciones: [{ numero: 1, nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=", limite: "35" }],
      naturaleza: "fraccionaria",
    };

    const borrador = borradorDesdeModelo(modelo);
    expect(borrador.variables).toEqual([
      { etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
      { etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
    ]);
    expect(borrador.coeficientesObjetivo).toEqual(["3", "2"]);
    expect(borrador.restricciones).toEqual([{ nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=", limite: "35" }]);
    expect(borrador.sentido).toBe("max");
    expect(borrador.naturaleza).toBe("fraccionaria");

    // Ida y vuelta: ensamblar de nuevo da un modelo equivalente (origen pasa a "editor").
    const reconstruido = construirModeloDesdeEditor(borrador);
    expect(reconstruido.ok).toBe(true);
    if (reconstruido.ok) {
      expect(reconstruido.modelo.origen).toBe("editor");
      expect(reconstruido.modelo.objetivo.coeficientes).toEqual(modelo.objetivo.coeficientes);
    }
  });
});
