/**
 * Persistencia del borrador del asistente (`features/asistente/borrador-almacenamiento.ts`, T5.2).
 *
 * El acceso a `localStorage` (try/catch, SSR, cuota) vive en `lib/almacenamiento.ts`: acá
 * quedan solo las cosas específicas del asistente — la clave, el esquema de validación y la
 * instantánea estable para `useSyncExternalStore`. Quien guarda, lee o borra llama directo a
 * `guardar` / `leer` / `borrar` de `@/lib/almacenamiento` con `CLAVE_BORRADOR_ASISTENTE`.
 *
 * Dominio puro aparte (AGENTS.md regla de oro #1): este archivo NO importa React ni toca
 * `localStorage` directamente; vive en `features/asistente/` porque el borrador es de la UI.
 */

import { z } from "zod";

import { leer, leerCrudo } from "@/lib/almacenamiento";

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

/**
 * Esquema de lectura del borrador guardado. `z.custom` envuelve los chequeos estructurales
 * de arriba (ver nota en `esBorradorValido`); `z.object` descarta claves extra, así que
 * `leer` devuelve exactamente `{ borrador, paso, pasoMaximoAlcanzado }`.
 */
export const esquemaBorradorGuardado: z.ZodType<BorradorGuardado> = z.object({
  borrador: z.custom<BorradorAsistente>(esBorradorValido),
  paso: z.custom<NumeroPasoAsistente>(esPasoValido),
  pasoMaximoAlcanzado: z.custom<NumeroPasoAsistente>(esPasoValido),
});

// ---------------------------------------------------------------------------
// `getSnapshot` para `useSyncExternalStore` (banner "modelo sin terminar")
// ---------------------------------------------------------------------------
//
// `leer(...)` parsea JSON de nuevo en cada llamada: devuelve un objeto NUEVO (distinta
// referencia) aun cuando el contenido de `localStorage` no cambió. `useSyncExternalStore`
// exige que su `getSnapshot` devuelva la MISMA referencia mientras el store no cambie — si
// no, React entiende que hay "tearing" y vuelve a renderizar sin parar ("The result of
// getSnapshot should be cached to avoid an infinite loop"). Por eso esta función compara el
// string CRUDO (`leerCrudo`, sin parsear) contra el último visto, y solo vuelve a parsear
// cuando ese string efectivamente cambió. NO quitar este cache: si se reemplaza por una
// llamada directa a `leer`, vuelve el loop infinito.

let ultimoCrudo: string | null = null;
let ultimoValor: BorradorGuardado | null = null;

/** `getSnapshot` estable para `useSyncExternalStore`. Nunca lanza. */
export function obtenerInstantaneaBorradorGuardado(): BorradorGuardado | null {
  const crudo = leerCrudo(CLAVE_BORRADOR_ASISTENTE);

  if (crudo !== ultimoCrudo) {
    ultimoCrudo = crudo;
    ultimoValor = leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado);
  }

  return ultimoValor;
}
