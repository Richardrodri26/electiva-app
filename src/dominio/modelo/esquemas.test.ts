import { describe, expect, it } from "vitest";
import {
  MSG_ETIQUETA_DUPLICADA,
  MSG_NOMBRE_VACIO,
  MSG_NUMERO_DEMASIADO_GRANDE,
  MSG_NUMERO_EDITOR_INVALIDO,
  MSG_NUMERO_FORMATO_INVALIDO,
  MSG_NUMERO_NEGATIVO,
  MSG_NUMERO_SEPARADOR_MILES,
  MSG_OBJETIVO_TODO_CERO,
  MSG_RANGO_RESTRICCIONES,
  MSG_RANGO_VARIABLES,
  advertenciaObjetivoEnCero,
  esquemaEditor,
  esquemaModelo,
  esquemaPasoNaturaleza,
  esquemaPasoObjetivo,
  esquemaPasoRestricciones,
  esquemaPasoVariables,
  mensajeLimitacionSinOpciones,
  mensajeRestriccionSinVariables,
  nombreNoVacio,
  numeroAsistente,
  numeroEditor,
} from "./esquemas";

/** Primer mensaje de error de un `safeParse` fallido, para comparar contra el literal del CLI. */
function primerMensaje(resultado: { success: boolean; error?: { issues: { message: string }[] } }): string {
  if (resultado.success || resultado.error === undefined) {
    throw new Error("Se esperaba que la validación fallara.");
  }
  const [primero] = resultado.error.issues;
  if (primero === undefined) {
    throw new Error("Se esperaba al menos un issue.");
  }
  return primero.message;
}

describe("numeroAsistente — tabla entrada → mensaje (idéntica a validation.ts / io/prompt.ts)", () => {
  it.each([
    ["", MSG_NUMERO_FORMATO_INVALIDO],
    ["   ", MSG_NUMERO_FORMATO_INVALIDO],
    ["-5", MSG_NUMERO_NEGATIVO],
    ["-12,5", MSG_NUMERO_NEGATIVO],
    ["10.000", MSG_NUMERO_SEPARADOR_MILES],
    ["10,000", MSG_NUMERO_SEPARADOR_MILES],
    ["abc", MSG_NUMERO_FORMATO_INVALIDO],
    ["12.5.3", MSG_NUMERO_SEPARADOR_MILES],
    ["1/3", MSG_NUMERO_FORMATO_INVALIDO],
    ["1000000000001", MSG_NUMERO_DEMASIADO_GRANDE],
  ])('"%s" -> %s', (entrada, mensajeEsperado) => {
    const resultado = numeroAsistente.safeParse(entrada);
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(mensajeEsperado);
  });

  it.each([
    ["12", "12"],
    ["12,5", "12.5"],
    ["12.5", "12.5"],
    ["0", "0"],
    ["1000000000000", "1000000000000"],
    ["0.50", "0.5"],
    ["10.00", "10"],
  ])('"%s" -> NumeroTexto "%s" (sin pasar por el patrón de fracción)', (entrada, esperado) => {
    const resultado = numeroAsistente.safeParse(entrada);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toBe(esperado);
    }
  });

  it("rechaza una fracción 'a/b': el asistente solo acepta forma decimal", () => {
    const resultado = numeroAsistente.safeParse("1/3");
    expect(resultado.success).toBe(false);
  });
});

describe("numeroEditor", () => {
  it.each([
    ["3", "3"],
    ["-2", "-2"],
    ["2,5", "2.5"],
    ["2.5", "2.5"],
    ["1/3", "1/3"],
    ["-1/3", "-1/3"],
    ["2/4", "1/2"],
    ["0.500000", "0.5"],
  ])('"%s" -> NumeroTexto "%s"', (entrada, esperado) => {
    const resultado = numeroEditor.safeParse(entrada);
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toBe(esperado);
    }
  });

  it.each(["", "abc", "1/0", "1/-3", "1/03", "10.0000005"])(
    '"%s" es inválido con el mensaje único del editor',
    (entrada) => {
      const resultado = numeroEditor.safeParse(entrada);
      expect(resultado.success).toBe(false);
      expect(primerMensaje(resultado)).toBe(MSG_NUMERO_EDITOR_INVALIDO);
    },
  );

  it("rechaza un valor que supera 1e12 en magnitud, incluso como fracción", () => {
    const resultado = numeroEditor.safeParse("2000000000000/1");
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_NUMERO_EDITOR_INVALIDO);
  });

  it("acepta exactamente 1e12", () => {
    const resultado = numeroEditor.safeParse("1000000000000");
    expect(resultado.success).toBe(true);
  });
});

describe("nombreNoVacio", () => {
  it("rechaza texto vacío con el mensaje literal del CLI", () => {
    const resultado = nombreNoVacio.safeParse("");
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_NOMBRE_VACIO);
  });

  it("recorta espacios", () => {
    const resultado = nombreNoVacio.safeParse("  Mesas  ");
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data).toBe("Mesas");
    }
  });

  it("rechaza texto que es solo espacios (vacío tras el trim)", () => {
    const resultado = nombreNoVacio.safeParse("   ");
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_NOMBRE_VACIO);
  });
});

describe("esquemaPasoVariables", () => {
  const base = { categoria: 1 as const, unidad: "Unidades" };

  it("acepta entre 2 y 6 opciones", () => {
    expect(
      esquemaPasoVariables.safeParse({ ...base, nombresOpciones: ["Mesas", "Sillas"] }).success,
    ).toBe(true);
    expect(
      esquemaPasoVariables.safeParse({
        ...base,
        nombresOpciones: ["A", "B", "C", "D", "E", "F"],
      }).success,
    ).toBe(true);
  });

  it("rechaza menos de 2 o más de 6 opciones", () => {
    expect(esquemaPasoVariables.safeParse({ ...base, nombresOpciones: ["Mesas"] }).success).toBe(
      false,
    );
    expect(
      esquemaPasoVariables.safeParse({
        ...base,
        nombresOpciones: ["A", "B", "C", "D", "E", "F", "G"],
      }).success,
    ).toBe(false);
  });

  it("rechaza etiquetas duplicadas sin distinguir mayúsculas/minúsculas", () => {
    const resultado = esquemaPasoVariables.safeParse({
      ...base,
      nombresOpciones: ["Mesas", "mesas"],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_ETIQUETA_DUPLICADA);
  });
});

describe("esquemaPasoObjetivo", () => {
  it("acepta una meta y un aporte por variable", () => {
    const resultado = esquemaPasoObjetivo.safeParse({ meta: 1, coeficientes: ["3", "2"] });
    expect(resultado.success).toBe(true);
  });

  it("propaga el mensaje de numeroAsistente dentro del array de coeficientes", () => {
    const resultado = esquemaPasoObjetivo.safeParse({ meta: 1, coeficientes: ["3", "-2"] });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_NUMERO_NEGATIVO);
  });
});

describe("esquemaPasoRestricciones — decisión confirmada: 1 a 6 limitaciones", () => {
  const restriccionBase = {
    tipo: 1 as const,
    coeficientes: ["1", "1"],
    limite: "10",
    formaCumplimiento: 1 as const,
  };

  it("acepta una sola limitación (piso ampliado a 1, no 2 como en el CLI)", () => {
    const resultado = esquemaPasoRestricciones.safeParse({ restricciones: [restriccionBase] });
    expect(resultado.success).toBe(true);
  });

  it("acepta hasta 6 limitaciones y rechaza 7", () => {
    const seis = Array.from({ length: 6 }, () => restriccionBase);
    const siete = Array.from({ length: 7 }, () => restriccionBase);
    expect(esquemaPasoRestricciones.safeParse({ restricciones: seis }).success).toBe(true);
    const resultadoSiete = esquemaPasoRestricciones.safeParse({ restricciones: siete });
    expect(resultadoSiete.success).toBe(false);
    expect(primerMensaje(resultadoSiete)).toBe(MSG_RANGO_RESTRICCIONES);
  });

  it("bloquea una limitación sin ninguna opción, con el mensaje SIN jerga técnica", () => {
    const resultado = esquemaPasoRestricciones.safeParse({
      restricciones: [{ ...restriccionBase, coeficientes: ["0", "0"] }],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(mensajeLimitacionSinOpciones(1));
    expect(primerMensaje(resultado)).not.toMatch(/variable|restricción/i);
  });

  it("exige nombre personalizado cuando tipo es 8 ('Otra')", () => {
    const resultado = esquemaPasoRestricciones.safeParse({
      restricciones: [{ ...restriccionBase, tipo: 8 }],
    });
    expect(resultado.success).toBe(false);
  });

  it("acepta tipo 8 con nombre personalizado", () => {
    const resultado = esquemaPasoRestricciones.safeParse({
      restricciones: [{ ...restriccionBase, tipo: 8, nombrePersonalizado: "Marketing" }],
    });
    expect(resultado.success).toBe(true);
  });
});

describe("esquemaPasoNaturaleza", () => {
  it("acepta 'entera' y 'fraccionaria'", () => {
    expect(esquemaPasoNaturaleza.safeParse({ naturaleza: "entera" }).success).toBe(true);
    expect(esquemaPasoNaturaleza.safeParse({ naturaleza: "fraccionaria" }).success).toBe(true);
  });

  it("rechaza cualquier otro valor", () => {
    expect(esquemaPasoNaturaleza.safeParse({ naturaleza: "otra" }).success).toBe(false);
  });
});

describe("esquemaEditor", () => {
  const modeloValido = {
    variables: [
      { etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
      { etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
    ],
    sentido: "max" as const,
    coeficientesObjetivo: ["3", "2"],
    restricciones: [{ nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=" as const, limite: "35" }],
    naturaleza: "fraccionaria" as const,
  };

  it("acepta un modelo técnico válido", () => {
    expect(esquemaEditor.safeParse(modeloValido).success).toBe(true);
  });

  it("rechaza etiquetas de variable duplicadas sin distinguir mayúsculas/minúsculas", () => {
    const resultado = esquemaEditor.safeParse({
      ...modeloValido,
      variables: [
        { etiqueta: "Mesas", definicion: "x1." },
        { etiqueta: "MESAS", definicion: "x2." },
      ],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_ETIQUETA_DUPLICADA);
  });

  it("bloquea una restricción con todos los aportes en cero, con el mensaje TÉCNICO", () => {
    const resultado = esquemaEditor.safeParse({
      ...modeloValido,
      restricciones: [{ nombre: "Horas", coeficientes: ["0", "0"], relacion: "<=" as const, limite: "35" }],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(mensajeRestriccionSinVariables(1));
  });
});

describe("esquemaModelo — reglas cruzadas de docs/03 §3.3", () => {
  const modeloValido = {
    version: 1 as const,
    origen: "editor" as const,
    variables: [
      { nombre: "x1", etiqueta: "Mesas", definicion: "x1 = cantidad de Mesas." },
      { nombre: "x2", etiqueta: "Sillas", definicion: "x2 = cantidad de Sillas." },
    ],
    objetivo: { sentido: "max" as const, coeficientes: ["3", "2"], simbolo: "Z" as const },
    restricciones: [
      { numero: 1, nombre: "Horas", coeficientes: ["2", "5"], relacion: "<=" as const, limite: "35" },
    ],
    naturaleza: "fraccionaria" as const,
  };

  it("acepta un modelo válido completo", () => {
    const resultado = esquemaModelo.safeParse(modeloValido);
    expect(resultado.success).toBe(true);
  });

  it("rechaza menos de 2 variables", () => {
    const resultado = esquemaModelo.safeParse({
      ...modeloValido,
      variables: [modeloValido.variables[0]!],
      objetivo: { ...modeloValido.objetivo, coeficientes: ["3"] },
      restricciones: [{ ...modeloValido.restricciones[0], coeficientes: ["2"] }],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_RANGO_VARIABLES);
  });

  it("rechaza más de 6 restricciones", () => {
    const restriccion = modeloValido.restricciones[0]!;
    const siete = Array.from({ length: 7 }, (_, indice) => ({ ...restriccion, numero: indice + 1 }));
    const resultado = esquemaModelo.safeParse({ ...modeloValido, restricciones: siete });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(MSG_RANGO_RESTRICCIONES);
  });

  it("bloquea una restricción con todos los coeficientes en 0", () => {
    const resultado = esquemaModelo.safeParse({
      ...modeloValido,
      restricciones: [{ numero: 1, nombre: "Horas", coeficientes: ["0", "0"], relacion: "<=" as const, limite: "35" }],
    });
    expect(resultado.success).toBe(false);
    expect(primerMensaje(resultado)).toBe(mensajeRestriccionSinVariables(1));
  });

  it("acepta un objetivo con todos los coeficientes en 0 (es advertencia, no error)", () => {
    const resultado = esquemaModelo.safeParse({
      ...modeloValido,
      objetivo: { ...modeloValido.objetivo, coeficientes: ["0", "0"] },
    });
    expect(resultado.success).toBe(true);
  });

  it("marca error interno si la cantidad de aportes no coincide con la cantidad de variables", () => {
    const resultado = esquemaModelo.safeParse({
      ...modeloValido,
      objetivo: { ...modeloValido.objetivo, coeficientes: ["3", "2", "1"] },
    });
    expect(resultado.success).toBe(false);
  });
});

describe("advertenciaObjetivoEnCero", () => {
  it("devuelve el texto de aviso cuando todos los aportes son 0", () => {
    expect(advertenciaObjetivoEnCero({ coeficientes: ["0", "0.0", "0/5"] })).toBe(MSG_OBJETIVO_TODO_CERO);
  });

  it("devuelve null cuando al menos un aporte no es 0", () => {
    expect(advertenciaObjetivoEnCero({ coeficientes: ["0", "3"] })).toBeNull();
  });
});
