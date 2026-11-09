/**
 * Wrapper genérico y seguro sobre `localStorage` (`lib/almacenamiento.ts`) —
 * ver docs/02-arquitectura.md §2 (`lib/almacenamiento.ts # wrapper seguro de localStorage (try/catch)`).
 *
 * `localStorage` puede no estar disponible (SSR, donde no existe `window`; modo privado
 * de algunos navegadores que lo bloquea) o lanzar al escribir (`QuotaExceededError` si se
 * llena el cupo). Ninguna de las tres funciones de este módulo lanza nunca: todas devuelven
 * un valor "neutro" (`null`/`false`/nada) cuando algo falla, y quien las usa decide qué
 * hacer (ej. mostrar un toast, o simplemente no persistir el borrador).
 *
 * Genérico a propósito (no depende de ningún feature puntual): lo usa el autoguardado del
 * editor (T4.2, clave `pl:borrador:editor`) y lo reusará el historial (`pl:historial`,
 * tarea futura) — ninguno de los dos esquemas de validación vive acá, cada llamador trae
 * el suyo (Zod, regla de oro #3 de AGENTS.md).
 *
 * No es parte del dominio puro (`src/dominio/**`): depende de una API del navegador, por
 * eso vive en `lib/`, la misma capa que `url-state.ts` (regla de oro #1 de AGENTS.md).
 */

import type { z } from "zod";

/**
 * `localStorage` como variable global (no `window.localStorage`): en el navegador ambas
 * formas son el mismo objeto, pero referenciar la global directamente evita depender de
 * `window` y hace el módulo trivial de probar (alcanza con `vi.stubGlobal("localStorage", …)`).
 * Devuelve `null` si no existe (SSR) o si acceder a ella lanza (algunos navegadores en modo
 * privado estricto lanzan al sólo LEER la propiedad `localStorage`, no solo al usarla).
 */
function obtenerAlmacen(): Storage | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Lee y valida un valor guardado bajo `clave`. Devuelve `null` si no hay nada guardado, si
 * `localStorage` no está disponible, si el contenido no es JSON válido o si no cumple
 * `esquema` (dato corrupto o de una versión anterior incompatible) — nunca lanza.
 */
export function leer<T>(clave: string, esquema: z.ZodType<T>): T | null {
  const almacen = obtenerAlmacen();
  if (almacen === null) {
    return null;
  }
  try {
    const crudo = almacen.getItem(clave);
    if (crudo === null) {
      return null;
    }
    const json: unknown = JSON.parse(crudo);
    const resultado = esquema.safeParse(json);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve el string crudo guardado bajo `clave`, sin parsear, o `null` si no hay nada o
 * `localStorage` no está disponible. Sirve para comparar si el contenido cambió sin pagar
 * el `JSON.parse` (ej. `getSnapshot` de `useSyncExternalStore`). Nunca lanza.
 */
export function leerCrudo(clave: string): string | null {
  const almacen = obtenerAlmacen();
  if (almacen === null) {
    return null;
  }
  try {
    return almacen.getItem(clave);
  } catch {
    return null;
  }
}

/**
 * Guarda `valor` (serializado con `JSON.stringify`) bajo `clave`. Devuelve `true` si se
 * guardó, `false` si `localStorage` no está disponible o si escribir lanzó (ej. cupo lleno:
 * `QuotaExceededError`, o `valor` no es serializable) — nunca lanza.
 */
export function guardar<T>(clave: string, valor: T): boolean {
  const almacen = obtenerAlmacen();
  if (almacen === null) {
    return false;
  }
  try {
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

/**
 * Borra `clave`. No hace nada (sin lanzar) si `localStorage` no está disponible o si el
 * borrado falla.
 */
export function borrar(clave: string): void {
  const almacen = obtenerAlmacen();
  if (almacen === null) {
    return;
  }
  try {
    almacen.removeItem(clave);
  } catch {
    // No hay nada más que hacer si falla el borrado.
  }
}
