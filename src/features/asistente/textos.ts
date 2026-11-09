/**
 * Textos literales del asistente (`features/asistente/textos.ts`).
 *
 * Transcripción LITERAL de las preguntas de `console-program/src/flow/*.ts` (en tono
 * "usted", NUNCA "tú" — decisión confirmada con el usuario para la tarea T5.1) y de los
 * mensajes de error de `console-program/src/io/prompt.ts` (estos últimos ya viven como
 * constantes en `dominio/modelo/esquemas.ts` y no se repiten acá).
 *
 * Centralizados en un solo archivo para que:
 * 1. Los 4 componentes de paso no hardcodeen preguntas (fidelidad a la clase, AGENTS.md
 *    regla de oro #6: cualquier cambio de texto se hace en un solo lugar).
 * 2. `vocabulario.test.ts` pueda recorrer `TODOS_LOS_TEXTOS_ESTATICOS` buscando jerga
 *    técnica prohibida (AGENTS.md regla de oro #5 / docs/06-ux-ui.md §3.2: nunca
 *    "coeficiente", "restricción", "función objetivo", "variable", "maximizar",
 *    "minimizar") sin necesidad de renderizar los componentes.
 */

// ---------------------------------------------------------------------------
// Paso 1 — console-program/src/flow/definirVariables.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_1 = "Qué desea determinar";
export const PREGUNTA_CATEGORIA = "¿Qué desea determinar?";
export const PREGUNTA_CANTIDAD_OPCIONES = "¿Cuántas opciones diferentes desea comparar?";
export const ETIQUETA_CANTIDAD_OPCIONES = "Cantidad de opciones a comparar";

export function preguntaNombreOpcion(indice: number): string {
  return `¿Cómo desea llamar a la opción ${indice}?`;
}

export const PREGUNTA_UNIDAD = "¿En qué unidad se medirán las cantidades?";
export const ETIQUETA_UNIDAD_OTRA = "Escriba la unidad de medida:";

// ---------------------------------------------------------------------------
// Paso 2 — console-program/src/flow/definirObjetivo.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_2 = "Qué desea conseguir";
export const PREGUNTA_META = "¿Qué desea conseguir?";

export function preguntaAporteObjetivo(etiquetaOpcion: string): string {
  return `¿Cuánto aporta o cuesta cada ${etiquetaOpcion}?`;
}

// ---------------------------------------------------------------------------
// Paso 3 — console-program/src/flow/definirRestricciones.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_3 = "Registrar limitaciones";
export const PREGUNTA_TIPO_LIMITACION = "¿Qué tipo de limitación desea agregar?";
export const ETIQUETA_TIPO_LIMITACION_OTRA = "Escriba el nombre de esta limitación:";
export const PREGUNTA_FORMA_CUMPLIMIENTO = "¿Cómo debe cumplirse esta limitación?";
export const BOTON_AGREGAR_LIMITACION = "Agregar limitación";
export const BOTON_QUITAR_LIMITACION = "Quitar esta limitación";

export function preguntaAporteLimitacion(etiquetaOpcion: string, nombreLimitacion: string): string {
  return `¿Cuánto utiliza o aporta cada ${etiquetaOpcion} en "${nombreLimitacion}"?`;
}

export function preguntaLimiteLimitacion(nombreLimitacion: string): string {
  return `¿Cuál es la cantidad disponible, requerida o exacta para "${nombreLimitacion}"?`;
}

export function tituloLimitacion(numero: number, nombreLimitacion: string): string {
  return nombreLimitacion.trim() === "" ? `Limitación ${numero}` : `Limitación ${numero} · ${nombreLimitacion}`;
}

// ---------------------------------------------------------------------------
// Paso 4 — console-program/src/flow/definirNaturaleza.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_4 = "Naturaleza de las cantidades";
export const PREGUNTA_NATURALEZA =
  "¿Estas cantidades deben registrarse en unidades completas (no se pueden partir) o pueden ser fraccionarias?";

// ---------------------------------------------------------------------------
// Navegación — docs/06-ux-ui.md §3.2
// ---------------------------------------------------------------------------

export const BOTON_ATRAS = "Atrás";
export const BOTON_CONTINUAR = "Continuar";

export const TITULOS_PASOS: readonly [string, string, string, string] = [
  TITULO_PASO_1,
  TITULO_PASO_2,
  TITULO_PASO_3,
  TITULO_PASO_4,
];

/**
 * Todos los textos estáticos (sin interpolar) del asistente, para el chequeo de
 * vocabulario de `vocabulario.test.ts`. No es exhaustivo (no cubre los textos
 * parametrizados ni los mensajes de error de `esquemas.ts`, que se chequean aparte),
 * pero cubre toda pregunta y título fijo de los 4 pasos.
 */
export const TODOS_LOS_TEXTOS_ESTATICOS: readonly string[] = [
  TITULO_PASO_1,
  PREGUNTA_CATEGORIA,
  PREGUNTA_CANTIDAD_OPCIONES,
  ETIQUETA_CANTIDAD_OPCIONES,
  PREGUNTA_UNIDAD,
  ETIQUETA_UNIDAD_OTRA,
  TITULO_PASO_2,
  PREGUNTA_META,
  TITULO_PASO_3,
  PREGUNTA_TIPO_LIMITACION,
  ETIQUETA_TIPO_LIMITACION_OTRA,
  PREGUNTA_FORMA_CUMPLIMIENTO,
  BOTON_AGREGAR_LIMITACION,
  BOTON_QUITAR_LIMITACION,
  TITULO_PASO_4,
  PREGUNTA_NATURALEZA,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
];
