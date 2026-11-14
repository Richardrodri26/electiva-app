import type { CategoriaId, MetaId } from "@/dominio/modelo/tipos";

/**
 * Textos del asistente (`features/asistente/textos.ts`).
 *
 * Parten de las preguntas de `console-program/src/flow/*.ts` (en tono "usted", NUNCA
 * "tú" — decisión confirmada con el usuario para la tarea T5.1). Por decisión posterior
 * del usuario, varias preguntas YA NO son idénticas a las del CLI: se adaptan a la meta,
 * a la unidad y a la forma de cumplimiento elegidas para que una persona no técnica las
 * entienda (ver docs/06-ux-ui.md §3.2). Los mensajes de error viven como constantes en
 * `dominio/modelo/esquemas.ts` y no se repiten acá.
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
export const PREGUNTA_CANTIDAD_OPCIONES = "¿Cuántas opciones desea comparar?";
export const DESCRIPCION_CANTIDAD_OPCIONES = "Por ejemplo, 2 si compara mesas y sillas.";

/** Texto de ejemplo del nombre de cada opción, según la categoría elegida (id de `CATEGORIAS`). */
export const EJEMPLOS_NOMBRE_OPCION: Readonly<Record<CategoriaId, string>> = {
  1: "Ej.: Mesas",
  2: "Ej.: Mantenimiento",
  3: "Ej.: Proyecto A",
  4: "Ej.: Servidor",
};

export function preguntaNombreOpcion(indice: number): string {
  return `¿Cómo desea llamar a la opción ${indice}?`;
}

export const PREGUNTA_UNIDAD = "¿En qué unidad se medirán las cantidades?";
export const DESCRIPCION_UNIDAD = "Es la unidad en que contará cada opción: unidades, horas, toneladas…";
export const ETIQUETA_UNIDAD_OTRA = "Escriba la unidad de medida:";

// ---------------------------------------------------------------------------
// Paso 2 — console-program/src/flow/definirObjetivo.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_2 = "Qué desea conseguir";
export const PREGUNTA_META = "¿Qué desea conseguir?";

export const AVISO_ELEGIR_META_PRIMERO = "Primero elija qué desea conseguir.";

/**
 * Singular de la unidad elegida en el paso 1, para "cada {unidad} de «…»". Si no hay una
 * forma singular confiable (unidad escrita a mano con "Otra", "GB"), se usa "unidad".
 */
export function unidadEnSingular(unidad: string): string {
  switch (unidad.trim().toLowerCase()) {
    case "horas":
      return "hora";
    case "toneladas":
      return "tonelada";
    case "servicios":
      return "servicio";
    default:
      return "unidad";
  }
}

/**
 * Pregunta del aporte de cada opción a la meta, adaptada a la meta elegida (ids de
 * `METAS`: 1 utilidad, 2 ingreso, 3 solicitudes, 4 costo, 5 tiempo, 6 recursos).
 */
export function preguntaAporteObjetivo(meta: MetaId, nombreOpcion: string, unidad = "Unidades"): string {
  const cada = `cada ${unidadEnSingular(unidad)} de «${nombreOpcion}»`;
  switch (meta) {
    case 1:
      return `¿Cuánta ganancia deja ${cada}?`;
    case 2:
      return `¿Cuánto dinero ingresa por ${cada}?`;
    case 3:
      return `¿Cuántas solicitudes se atienden con ${cada}?`;
    case 4:
      return `¿Cuánto cuesta ${cada}?`;
    case 5:
      return `¿Cuánto tiempo toma ${cada}?`;
    case 6:
      return `¿Cuántos recursos consume ${cada}?`;
  }
}

// ---------------------------------------------------------------------------
// Paso 3 — console-program/src/flow/definirRestricciones.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_3 = "Registrar limitaciones";
export const PREGUNTA_TIPO_LIMITACION = "¿Qué tipo de limitación desea agregar?";
export const ETIQUETA_TIPO_LIMITACION_OTRA = "Escriba el nombre de esta limitación:";
export const PREGUNTA_FORMA_CUMPLIMIENTO = "¿Cómo debe cumplirse esta limitación?";
export const BOTON_AGREGAR_LIMITACION = "Agregar limitación";
export const DESCRIPCION_APORTE_LIMITACION = "Si no usa nada, escriba 0.";
export const DESCRIPCION_APORTE_LIMITACION_TOTAL = "Escriba 1 si esta opción cuenta para el total y 0 si no.";

export function botonQuitarLimitacion(numero: number): string {
  return `Quitar limitación ${numero}`;
}

export function preguntaAporteLimitacion(nombreOpcion: string, nombreLimitacion: string, unidad = "Unidades"): string {
  return `¿Cuánto de «${nombreLimitacion}» usa cada ${unidadEnSingular(unidad)} de «${nombreOpcion}»?`;
}

/** Pregunta del límite, adaptada a la forma de cumplimiento (ids de `FORMAS_CUMPLIMIENTO`). */
export function preguntaLimiteLimitacion(nombreLimitacion: string, forma: number): string {
  if (forma === 2) return `¿Cuánto se necesita como mínimo de «${nombreLimitacion}»?`;
  if (forma === 3) return `¿Cuánto debe ser exactamente «${nombreLimitacion}»?`;
  return `¿Cuánto hay disponible como máximo de «${nombreLimitacion}»?`;
}

export function tituloLimitacion(numero: number, nombreLimitacion: string): string {
  return nombreLimitacion.trim() === "" ? `Limitación ${numero}` : `Limitación ${numero} · ${nombreLimitacion}`;
}

// ---------------------------------------------------------------------------
// Paso 4 — console-program/src/flow/definirNaturaleza.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_4 = "Naturaleza de las cantidades";
export const DESCRIPCION_NATURALEZA = "Por ejemplo, no se pueden fabricar 2,5 mesas, pero sí trabajar 2,5 horas.";
export const PREGUNTA_NATURALEZA =
  "¿Estas cantidades deben registrarse en unidades completas (no se pueden partir) o pueden ser fraccionarias?";

// ---------------------------------------------------------------------------
// Paso 5 — console-program/src/flow/resumenYConfirmacion.ts y modelBuilder.ts
// ---------------------------------------------------------------------------

export const TITULO_PASO_5 = "Revisar";
export const INTRODUCCION_RESUMEN = "Así quedó planteado su problema en lenguaje matemático:";

export const BOTON_RESOLVER_MODELO = "Resolver modelo";
export const BOTON_CORREGIR = "Corregir…";
export const BOTON_CANCELAR = "Cancelar";

/**
 * Las 5 secciones de `OPCIONES_SECCION_MODIFICAR` (`resumenYConfirmacion.ts`), mismo
 * texto literal y mismo orden. "Todo desde el inicio" es la quinta opción del mismo
 * menú "Corregir…" (docs/06-ux-ui.md §3.2: "DropdownMenu con las 5 secciones del CLI"),
 * no una acción separada.
 */
export const OPCION_CORREGIR_OPCIONES = "Las opciones que se están comparando (nombres, cantidad, unidad)";
export const OPCION_CORREGIR_OBJETIVO = "Lo que se quiere lograr y cuánto aporta o cuesta cada opción";
export const OPCION_CORREGIR_LIMITACIONES = "Las limitaciones registradas";
export const OPCION_CORREGIR_NATURALEZA = "Si las cantidades son enteras o fraccionarias";
export const OPCION_CORREGIR_TODO = "Todo desde el inicio";

/**
 * Aviso LITERAL de `modelBuilder.ts` (caso `'variables'`) al elegir corregir "las
 * opciones": como cambia la cantidad/los nombres, también hay que volver a indicar el
 * aporte de cada una y los datos de las limitaciones (decisión #2 confirmada para T5.2).
 */
export const AVISO_CORREGIR_OPCIONES =
  "Como va a cambiar las opciones que se comparan, también va a tener que volver a indicar cuánto aporta cada una y los datos de las limitaciones.";

export const TITULO_DIALOGO_CANCELAR = "¿Cancelar y borrar lo registrado?";
export const DESCRIPCION_DIALOGO_CANCELAR =
  "Se va a borrar todo lo que registró en el asistente. Esta acción no se puede deshacer.";
export const BOTON_CONFIRMAR_CANCELAR = "Sí, cancelar";
export const BOTON_VOLVER_DIALOGO = "Volver";

/**
 * Banner de borrador sin terminar (docs/06-ux-ui.md §3.2). docs/06 cita el título en
 * tono "tú" ("Tienes un modelo sin terminar"), pero T5.1 fijó "usted" para todo el
 * asistente: se usa acá la forma "usted" por consistencia con el resto de los textos
 * (ver nota de ambigüedad en el resumen de la tarea T5.2).
 */
export const TITULO_BANNER_BORRADOR = "Tiene un modelo sin terminar";
export const BOTON_CONTINUAR_BORRADOR = "Retomar el modelo";
export const BOTON_DESCARTAR_BORRADOR = "Descartar";

// ---------------------------------------------------------------------------
// Navegación — docs/06-ux-ui.md §3.2
// ---------------------------------------------------------------------------

export const BOTON_ATRAS = "Atrás";
export const BOTON_CONTINUAR = "Continuar";

export const TITULOS_PASOS: readonly [string, string, string, string, string] = [
  TITULO_PASO_1,
  TITULO_PASO_2,
  TITULO_PASO_3,
  TITULO_PASO_4,
  TITULO_PASO_5,
];

/** Nombres cortos del stepper en pantallas anchas (el título completo queda en `title`). */
export const TITULOS_PASOS_CORTOS: readonly [string, string, string, string, string] = [
  "Qué decide",
  "Meta",
  "Limitaciones",
  "Cantidades",
  "Revisar",
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
  DESCRIPCION_CANTIDAD_OPCIONES,
  DESCRIPCION_UNIDAD,
  DESCRIPCION_NATURALEZA,
  DESCRIPCION_APORTE_LIMITACION,
  DESCRIPCION_APORTE_LIMITACION_TOTAL,
  AVISO_ELEGIR_META_PRIMERO,
  INTRODUCCION_RESUMEN,
  ...Object.values(EJEMPLOS_NOMBRE_OPCION),
  PREGUNTA_UNIDAD,
  ETIQUETA_UNIDAD_OTRA,
  TITULO_PASO_2,
  PREGUNTA_META,
  TITULO_PASO_3,
  PREGUNTA_TIPO_LIMITACION,
  ETIQUETA_TIPO_LIMITACION_OTRA,
  PREGUNTA_FORMA_CUMPLIMIENTO,
  BOTON_AGREGAR_LIMITACION,
  TITULO_PASO_4,
  PREGUNTA_NATURALEZA,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
  TITULO_PASO_5,
  BOTON_RESOLVER_MODELO,
  BOTON_CORREGIR,
  BOTON_CANCELAR,
  OPCION_CORREGIR_OPCIONES,
  OPCION_CORREGIR_OBJETIVO,
  OPCION_CORREGIR_LIMITACIONES,
  OPCION_CORREGIR_NATURALEZA,
  OPCION_CORREGIR_TODO,
  AVISO_CORREGIR_OPCIONES,
  TITULO_DIALOGO_CANCELAR,
  DESCRIPCION_DIALOGO_CANCELAR,
  BOTON_CONFIRMAR_CANCELAR,
  BOTON_VOLVER_DIALOGO,
  TITULO_BANNER_BORRADOR,
  BOTON_CONTINUAR_BORRADOR,
  BOTON_DESCARTAR_BORRADOR,
];
