/**
 * Persistencia del borrador del asistente en `localStorage`
 * (`features/asistente/borrador-almacenamiento.ts`, tarea T5.2).
 *
 * Wrapper simple e inline con `try/catch` (no depende de `src/lib/almacenamiento.ts`:
 * esa utilidad puede no existir todavía — la está armando en paralelo el agente de
 * `src/features/editor/`, ver prompt de la tarea). `localStorage` puede no estar
 * disponible (render en el servidor, modo privado, cuota excedida, navegador sin
 * soporte): ninguna función de este archivo lanza nunca, para que el asistente siga
 * funcionando igual sin persistencia si eso pasa.
 *
 * Dominio puro aparte (AGENTS.md regla de oro #1): este archivo SÍ toca una API del
 * navegador (`localStorage`), por eso vive en `features/asistente/`, no en
 * `src/dominio/**`.
 */

import type { BorradorAsistente } from "./estado";
import type { NumeroPasoAsistente } from "./use-paso-asistente";

/** Clave de `localStorage` para el borrador del asistente (fijada en el prompt de T5.2). */
export const CLAVE_BORRADOR_ASISTENTE = "pl:borrador:asistente";

/** Lo que se persiste: el borrador de los 4 pasos, más dónde estaba el usuario. */
export interface BorradorGuardado {
  borrador: BorradorAsistente;
  paso: NumeroPasoAsistente;
  /** El paso más lejano ya validado, para restaurar el alcance del stepper. */
  pasoMaximoAlcanzado: NumeroPasoAsistente;
}

function esPasoValido(valor: unknown): valor is NumeroPasoAsistente {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

function esArregloDeTextos(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((elemento) => typeof elemento === "string");
}

/**
 * Chequeo estructural mínimo (NO es el esquema Zod del dominio — esto es un borrador de
 * UI todavía sin validar, cada paso se revalida con sus propios esquemas al continuar):
 * solo evita que un valor corrupto en `localStorage` rompa el render del paso
 * restaurado. Alcanza con confirmar la forma de cada paso, no sus valores.
 */
function esBorradorValido(valor: unknown): valor is BorradorAsistente {
  if (typeof valor !== "object" || valor === null) return false;
  const borrador = valor as Record<string, unknown>;

  const paso1 = borrador.paso1 as Record<string, unknown> | undefined;
  const paso2 = borrador.paso2 as Record<string, unknown> | undefined;
  const paso3 = borrador.paso3 as Record<string, unknown> | undefined;
  const paso4 = borrador.paso4 as Record<string, unknown> | undefined;

  const paso1Valido =
    typeof paso1 === "object" &&
    paso1 !== null &&
    esArregloDeTextos(paso1.nombresOpciones) &&
    typeof paso1.unidadId === "number";

  const paso2Valido = typeof paso2 === "object" && paso2 !== null && esArregloDeTextos(paso2.coeficientes);

  const paso3Valido = typeof paso3 === "object" && paso3 !== null && Array.isArray(paso3.restricciones);

  const paso4Valido = typeof paso4 === "object" && paso4 !== null && typeof paso4.naturaleza === "number";

  return paso1Valido && paso2Valido && paso3Valido && paso4Valido;
}

/** Guarda el borrador y la posición actual. Nunca lanza. */
export function guardarBorrador(datos: BorradorGuardado): void {
  try {
    localStorage.setItem(CLAVE_BORRADOR_ASISTENTE, JSON.stringify(datos));
  } catch {
    // `localStorage` no disponible (SSR, modo privado, cuota excedida): se ignora, el
    // asistente sigue funcionando sin persistencia.
  }
}

/** Lee el borrador guardado, o `null` si no hay uno (o no es válido). Nunca lanza. */
export function leerBorrador(): BorradorGuardado | null {
  try {
    const texto = localStorage.getItem(CLAVE_BORRADOR_ASISTENTE);
    if (texto === null) return null;

    const json = JSON.parse(texto) as unknown;
    if (typeof json !== "object" || json === null) return null;
    const datos = json as Record<string, unknown>;

    if (!esBorradorValido(datos.borrador) || !esPasoValido(datos.paso) || !esPasoValido(datos.pasoMaximoAlcanzado)) {
      return null;
    }

    return { borrador: datos.borrador, paso: datos.paso, pasoMaximoAlcanzado: datos.pasoMaximoAlcanzado };
  } catch {
    return null;
  }
}

/** Borra el borrador guardado. Nunca lanza. */
export function borrarBorrador(): void {
  try {
    localStorage.removeItem(CLAVE_BORRADOR_ASISTENTE);
  } catch {
    // Ver nota de `guardarBorrador`.
  }
}

// ---------------------------------------------------------------------------
// `getSnapshot` para `useSyncExternalStore` (banner "modelo sin terminar")
// ---------------------------------------------------------------------------
//
// `leerBorrador()` arriba parsea JSON de nuevo en cada llamada: devuelve un objeto
// NUEVO (distinta referencia) aun cuando el contenido de `localStorage` no cambió.
// `useSyncExternalStore` exige que su `getSnapshot` devuelva la MISMA referencia
// mientras el store no cambie — si no, React entiende que hay "tearing" y vuelve a
// renderizar sin parar ("The result of getSnapshot should be cached to avoid an
// infinite loop"). Por eso esta variante cachea el último valor ya parseado, y solo
// vuelve a parsear cuando el string crudo de `localStorage` efectivamente cambió.

let ultimoCrudo: string | null = null;
let ultimoValor: BorradorGuardado | null = null;

/** `getSnapshot` estable para `useSyncExternalStore`. Nunca lanza. */
export function obtenerInstantaneaBorradorGuardado(): BorradorGuardado | null {
  let crudo: string | null;
  try {
    crudo = localStorage.getItem(CLAVE_BORRADOR_ASISTENTE);
  } catch {
    crudo = null;
  }

  if (crudo !== ultimoCrudo) {
    ultimoCrudo = crudo;
    ultimoValor = leerBorrador();
  }

  return ultimoValor;
}
