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
