import { describe, expect, it } from "vitest";

import {
  CATEGORIAS,
  FORMAS_CUMPLIMIENTO,
  METAS,
  OPCIONES_NATURALEZA,
  TIPOS_RESTRICCION,
  UNIDADES,
} from "@/dominio/modelo/catalogos";
import {
  esquemaPasoNaturaleza,
  esquemaPasoObjetivo,
  esquemaPasoRestricciones,
  esquemaPasoVariables,
  MSG_ELEGIR_CATEGORIA,
  MSG_ELEGIR_FORMA_CUMPLIMIENTO,
  MSG_ELEGIR_META,
  MSG_ELEGIR_NATURALEZA,
  MSG_ELEGIR_TIPO_LIMITACION,
  MSG_UNIDAD_VACIA,
  nombreNoVacio,
  numeroAsistente,
} from "@/dominio/modelo/esquemas";

import { crearBorradorAsistente, validarPaso1, validarPaso2, validarPaso3, validarPaso4 } from "./estado";

import {
  BOTON_AGREGAR_LIMITACION,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
  botonQuitarLimitacion,
  preguntaAporteLimitacion,
  preguntaAporteObjetivo,
  preguntaLimiteLimitacion,
  preguntaNombreOpcion,
  tituloLimitacion,
  TODOS_LOS_TEXTOS_ESTATICOS,
} from "./textos";

/**
 * Guardia de vocabulario (no exhaustiva, ver nota de la tarea T5.1): ningún texto visible
 * de los pasos 1 a 4 debe usar jerga técnica de programación lineal. AGENTS.md regla de
 * oro #5 y docs/06-ux-ui.md §3.2 prohíben, en lo que ve el usuario del asistente:
 * "coeficiente", "lado derecho", "función objetivo", "restricción", "variable",
 * "maximizar", "minimizar".
 *
 * "limitación" SÍ está permitido (es el término del CLI para lo que, técnicamente, es una
 * restricción) — por eso se verifica la palabra completa "restricción"/"restriccion", no
 * un prefijo que la confundiría con "limitación".
 */
const PALABRAS_PROHIBIDAS = [
  "coeficiente",
  "lado derecho",
  "función objetivo",
  "funcion objetivo",
  "restricción",
  "restriccion",
  "variable",
  "maximizar",
  "minimizar",
];

function normalizar(texto: string): string {
  return texto.toLowerCase();
}

function verificarSinJerga(textos: readonly string[]): void {
  for (const texto of textos) {
    const normalizado = normalizar(texto);
    for (const prohibida of PALABRAS_PROHIBIDAS) {
      expect(normalizado.includes(prohibida), `"${texto}" contiene la palabra prohibida "${prohibida}"`).toBe(false);
    }
  }
}

describe("asistente — vocabulario sin jerga técnica (pasos 1 a 5)", () => {
  it("los textos estáticos de los 5 pasos no usan jerga técnica", () => {
    verificarSinJerga(TODOS_LOS_TEXTOS_ESTATICOS);
  });

  it("los textos parametrizados (preguntas por opción/limitación) tampoco", () => {
    verificarSinJerga([
      preguntaNombreOpcion(1),
      ...([1, 2, 3, 4, 5, 6] as const).map((meta) => preguntaAporteObjetivo(meta, "Mesas")),
      preguntaAporteLimitacion("Mesas", "Horas"),
      preguntaLimiteLimitacion("Horas", 1),
      preguntaLimiteLimitacion("Horas", 2),
      preguntaLimiteLimitacion("Horas", 3),
      tituloLimitacion(1, "Horas"),
      tituloLimitacion(2, ""),
    ]);
  });

  it("la pregunta del aporte se adapta a la meta y a la unidad", () => {
    expect(preguntaAporteObjetivo(1, "Mesas")).toBe("¿Cuánta ganancia deja cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(2, "Mesas")).toBe("¿Cuánto dinero ingresa por cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(3, "Mesas")).toBe("¿Cuántas solicitudes se atienden con cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(4, "Mesas")).toBe("¿Cuánto cuesta cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(5, "Mesas")).toBe("¿Cuánto tiempo toma cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(6, "Mesas")).toBe("¿Cuántos recursos consume cada unidad de «Mesas»?");
    expect(preguntaAporteObjetivo(5, "Soporte", "Horas")).toBe("¿Cuánto tiempo toma cada hora de «Soporte»?");
    expect(preguntaAporteObjetivo(1, "Soporte", "Otra rara")).toBe("¿Cuánta ganancia deja cada unidad de «Soporte»?");
  });

  it("la pregunta del límite se adapta a la forma de cumplimiento", () => {
    expect(preguntaLimiteLimitacion("Horas", 1)).toBe("¿Cuánto hay disponible como máximo de «Horas»?");
    expect(preguntaLimiteLimitacion("Horas", 2)).toBe("¿Cuánto se necesita como mínimo de «Horas»?");
    expect(preguntaLimiteLimitacion("Horas", 3)).toBe("¿Cuánto debe ser exactamente «Horas»?");
  });

  it("los botones de navegación no usan jerga técnica", () => {
    verificarSinJerga([BOTON_ATRAS, BOTON_CONTINUAR, BOTON_AGREGAR_LIMITACION, botonQuitarLimitacion(2)]);
  });

  it("las etiquetas de los catálogos que se muestran en el asistente no usan jerga técnica", () => {
    verificarSinJerga(CATEGORIAS.map((o) => o.etiqueta));
    verificarSinJerga(UNIDADES.map((o) => o.etiqueta));
    verificarSinJerga(METAS.map((o) => o.etiqueta));
    verificarSinJerga(TIPOS_RESTRICCION.map((o) => o.etiqueta));
    verificarSinJerga(FORMAS_CUMPLIMIENTO.map((o) => o.etiqueta));
    verificarSinJerga(OPCIONES_NATURALEZA.map((o) => o.etiqueta));
  });
});

/** Textos por defecto de Zod (en español o en inglés) que nunca deben llegar al usuario. */
const FRAGMENTOS_GENERICOS_DE_ZOD = [
  "entrada inválida",
  "opción inválida",
  "se esperaba",
  "recibido",
  "demasiado grande:",
  "demasiado pequeño:",
  "invalid input",
  "invalid option",
  "required",
  "expected",
  "too big",
  "too small",
];

function mensajesDe(resultado: { success: boolean; error?: { issues: readonly { message: string }[] } }): string[] {
  return resultado.success ? [] : resultado.error!.issues.map((issue) => issue.message);
}

describe("asistente — mensajes de error visibles", () => {
  const mal = [null, undefined, "", "   ", "abc", 0, 99, {}, []] as const;

  /** Todos los mensajes que producen los esquemas del asistente con entradas faltantes o absurdas. */
  function recolectarMensajes(): string[] {
    const todos: string[] = [];
    const base = crearBorradorAsistente();
    for (const valor of mal) {
      todos.push(
        ...mensajesDe(esquemaPasoVariables.safeParse({ categoria: valor, unidad: valor, nombresOpciones: valor })),
        ...mensajesDe(esquemaPasoVariables.safeParse({ categoria: 1, unidad: "x", nombresOpciones: [valor, valor] })),
        ...mensajesDe(esquemaPasoObjetivo.safeParse({ meta: valor, coeficientes: valor })),
        ...mensajesDe(esquemaPasoObjetivo.safeParse({ meta: 1, coeficientes: [valor, valor] })),
        ...mensajesDe(esquemaPasoRestricciones.safeParse({ restricciones: valor })),
        ...mensajesDe(
          esquemaPasoRestricciones.safeParse({
            restricciones: [{ tipo: valor, nombrePersonalizado: valor, coeficientes: valor, limite: valor, formaCumplimiento: valor }],
          }),
        ),
        ...mensajesDe(
          esquemaPasoRestricciones.safeParse({
            restricciones: [{ tipo: 8, nombrePersonalizado: valor, coeficientes: [valor, valor], limite: valor, formaCumplimiento: 1 }],
          }),
        ),
        ...mensajesDe(esquemaPasoNaturaleza.safeParse({ naturaleza: valor })),
        ...mensajesDe(numeroAsistente.safeParse(valor)),
        ...mensajesDe(nombreNoVacio.safeParse(valor)),
      );
    }
    todos.push(
      ...mensajesDe(esquemaPasoVariables.safeParse({ categoria: 1, unidad: "x", nombresOpciones: ["a".repeat(41), "b"] })),
      ...mensajesDe(esquemaPasoVariables.safeParse({ categoria: 1, unidad: "x", nombresOpciones: ["a"] })),
      ...mensajesDe(esquemaPasoVariables.safeParse({ categoria: 1, unidad: "x", nombresOpciones: Array(7).fill("a") })),
      ...mensajesDe(esquemaPasoRestricciones.safeParse({ restricciones: [] })),
      ...mensajesDe(validarPaso1(base.paso1)),
      ...mensajesDe(validarPaso2(base.paso2)),
      ...mensajesDe(validarPaso3(base.paso3)),
      ...mensajesDe(validarPaso4(base.paso4)),
    );
    return todos;
  }

  it("categoría, meta, tipo, forma y naturaleza sin elegir dicen qué hacer", () => {
    const base = crearBorradorAsistente();
    expect(mensajesDe(validarPaso1(base.paso1))).toContain(MSG_ELEGIR_CATEGORIA);
    expect(mensajesDe(validarPaso2(base.paso2))).toContain(MSG_ELEGIR_META);
    expect(mensajesDe(esquemaPasoNaturaleza.safeParse({ naturaleza: undefined }))).toEqual([MSG_ELEGIR_NATURALEZA]);
    expect(
      mensajesDe(
        esquemaPasoRestricciones.safeParse({
          restricciones: [{ tipo: null, coeficientes: ["1", "1"], limite: "1", formaCumplimiento: null }],
        }),
      ),
    ).toEqual([MSG_ELEGIR_TIPO_LIMITACION, MSG_ELEGIR_FORMA_CUMPLIMIENTO]);
    expect(MSG_ELEGIR_CATEGORIA).toBe("Elija qué desea determinar.");
    expect(MSG_ELEGIR_META).toBe("Elija qué desea conseguir.");
  });

  it("la unidad vacía pide la unidad de medida", () => {
    const resultado = esquemaPasoVariables.safeParse({ categoria: 1, unidad: "", nombresOpciones: ["a", "b"] });
    expect(mensajesDe(resultado)).toEqual([MSG_UNIDAD_VACIA]);
  });

  it("ningún mensaje es un texto genérico de Zod", () => {
    const mensajes = recolectarMensajes();
    expect(mensajes.length).toBeGreaterThan(10);
    for (const mensaje of mensajes) {
      const normalizado = normalizar(mensaje);
      for (const generico of FRAGMENTOS_GENERICOS_DE_ZOD) {
        expect(normalizado.includes(generico), `"${mensaje}" contiene el texto genérico "${generico}"`).toBe(false);
      }
    }
  });

  it("ningún mensaje usa jerga técnica", () => {
    verificarSinJerga(recolectarMensajes());
  });
});
