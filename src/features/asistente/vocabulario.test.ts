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
  BOTON_QUITAR_LIMITACION,
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
      preguntaAporteObjetivo("Mesas"),
      preguntaAporteLimitacion("Mesas", "Horas"),
      preguntaLimiteLimitacion("Horas"),
      tituloLimitacion(1, "Horas"),
      tituloLimitacion(2, ""),
    ]);
  });

  it("los botones de navegación no usan jerga técnica", () => {
    verificarSinJerga([BOTON_ATRAS, BOTON_CONTINUAR, BOTON_AGREGAR_LIMITACION, BOTON_QUITAR_LIMITACION]);
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
