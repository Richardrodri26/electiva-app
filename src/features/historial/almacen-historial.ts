/**
 * Lógica pura del historial sobre `localStorage` (`features/historial/almacen-historial.ts`) —
 * tarea T7.1, docs/02-arquitectura.md §3.2 y docs/01-producto.md Alcance punto 7 / HU-08.
 *
 * Sin React: estas funciones son las que `use-historial.ts` envuelve en `useQuery`/
 * `useMutation` (AGENTS.md regla de oro #1 es sobre `src/dominio/**`, pero el mismo criterio
 * de "separar la lógica de la UI" aplica acá para poder probarla con Vitest sin un DOM).
 *
 * Usa el wrapper existente `lib/almacenamiento.ts` (`leer`/`guardar`), que ya es tolerante a
 * que `localStorage` no esté disponible (SSR, modo privado): ninguna función de este módulo
 * lanza nunca, y si `localStorage` no está disponible el historial simplemente se comporta
 * como si estuviera siempre vacío (lecturas devuelven `[]`, escrituras no persisten pero
 * tampoco rompen la app).
 *
 * Deduplicación por `hashModelo` (docs/02 §3.2, decisión confirmada): si ya existe una
 * entrada con el mismo hash, se actualiza (fecha nueva, se mueve al principio) en vez de
 * duplicarla. El título es independiente del hash (`hashModelo` ya lo excluye — ver
 * `dominio/modelo/serializacion.ts`): al volver a resolver un modelo ya guardado se conserva
 * el título que el usuario le haya puesto, salvo que se pase uno explícito (caso "Guardar
 * con nombre").
 */

import { formatearFuncionObjetivoTexto } from "@/dominio/modelo/formato";
import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";
import { guardar, leer } from "@/lib/almacenamiento";

import { esquemaHistorial, type EntradaHistorial } from "./tipos";

/** Clave de `localStorage` (docs/02-arquitectura.md §3: "Historial: `localStorage` (`pl:historial`)"). */
export const CLAVE_HISTORIAL = "pl:historial";

/** Máximo de entradas conservadas (docs/01 Alcance punto 7: "últimos 20 modelos resueltos"). */
export const LIMITE_HISTORIAL = 20;

/** Título por defecto cuando no hay uno explícito ni uno guardado antes: la función objetivo. */
function tituloPorDefecto(modelo: ModeloLineal): string {
  return modelo.titulo ?? formatearFuncionObjetivoTexto(modelo);
}

/**
 * Historial completo, más reciente primero. `[]` si no hay nada guardado, si el contenido
 * está corrupto/de otra versión (no pasa `esquemaHistorial`), o si `localStorage` no está
 * disponible — nunca lanza.
 */
export function obtenerHistorial(): EntradaHistorial[] {
  return leer(CLAVE_HISTORIAL, esquemaHistorial) ?? [];
}

/**
 * Guarda (o actualiza) la resolución de `modelo` en el historial y devuelve la entrada
 * resultante. Si ya hay una entrada con el mismo `hashModelo(modelo)`, se la reemplaza
 * (fecha nueva, se mueve al principio) en vez de duplicarla.
 *
 * `tituloExplicito` es para "Guardar con nombre" (siempre se usa tal cual, incluso para
 * sobrescribir un título anterior). Sin `tituloExplicito` (autoguardado al resolver), se
 * conserva el título de la entrada existente si había una, o se usa `tituloPorDefecto` si es
 * la primera vez que se guarda este modelo.
 */
export function guardarEnHistorial(
  modelo: ModeloLineal,
  estado: EstadoSimplex,
  tituloExplicito?: string,
): EntradaHistorial {
  const hash = hashModelo(modelo);
  const actual = obtenerHistorial();
  const existente = actual.find((entrada) => entrada.hash === hash);

  const entrada: EntradaHistorial = {
    hash,
    modelo,
    titulo: tituloExplicito ?? existente?.titulo ?? tituloPorDefecto(modelo),
    fecha: new Date().toISOString(),
    estado,
  };

  const resto = actual.filter((item) => item.hash !== hash);
  const siguiente = [entrada, ...resto].slice(0, LIMITE_HISTORIAL);
  guardar(CLAVE_HISTORIAL, siguiente);
  return entrada;
}

/** Cambia el título de la entrada `hash`. No hace nada si no existe (ej. ya se había borrado). */
export function renombrarEntrada(hash: string, titulo: string): EntradaHistorial[] {
  const siguiente = obtenerHistorial().map((entrada) =>
    entrada.hash === hash ? { ...entrada, titulo } : entrada,
  );
  guardar(CLAVE_HISTORIAL, siguiente);
  return siguiente;
}

/** Elimina la entrada `hash`. No hace nada si no existe. */
export function eliminarEntrada(hash: string): EntradaHistorial[] {
  const siguiente = obtenerHistorial().filter((entrada) => entrada.hash !== hash);
  guardar(CLAVE_HISTORIAL, siguiente);
  return siguiente;
}
