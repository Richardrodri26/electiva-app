/**
 * Tipos y esquema Zod de una entrada del historial (`features/historial/tipos.ts`) —
 * docs/02-arquitectura.md §3.2 ("Historial: `localStorage` (`pl:historial`)") y
 * docs/01-producto.md Alcance punto 7 / HU-08.
 *
 * Zod es la única fuente de validación (AGENTS.md regla de oro #3): `esquemaEntradaHistorial`
 * reusa `esquemaModelo` del dominio (ni se redefine ni se relaja) y es lo que `leer()` de
 * `lib/almacenamiento.ts` usa para validar lo que haya en `localStorage` bajo `pl:historial`
 * (dato corrupto o de otra versión → se descarta esa entrada, nunca rompe la app).
 *
 * Cada entrada guarda el modelo serializable completo (no solo el hash) para poder
 * reabrirlo con `serializarModelo` sin volver a resolverlo; el `titulo` es independiente
 * del `hash` (decisión confirmada: renombrar no duplica, `hashModelo` ya excluye el título
 * del modelo — ver `dominio/modelo/serializacion.ts`).
 */

import { z } from "zod";

import { esquemaModelo } from "@/dominio/modelo/esquemas";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";

/** Espejo de `EstadoSimplex` (`dominio/simplex/tipos.ts`) como esquema Zod. */
const esquemaEstadoSimplex: z.ZodType<EstadoSimplex> = z.enum([
  "optimo",
  "optimos_alternativos",
  "no_acotado",
  "infactible",
  "limite_iteraciones",
] as const);

/**
 * Una entrada del historial. `fecha` es un string ISO 8601 (`Date.toISOString()`): se guarda
 * como texto porque `JSON.stringify`/`localStorage` no tienen un tipo `Date` nativo, y así
 * viaja igual de bien por `leer`/`guardar` (`lib/almacenamiento.ts`) que cualquier otro campo.
 */
export const esquemaEntradaHistorial = z.object({
  /** `hashModelo(modelo)` — clave de deduplicación (EXCLUYE el título del modelo). */
  hash: z.string().min(1),
  modelo: esquemaModelo,
  /** Título de la entrada en el historial: editable, independiente de `modelo.titulo`. */
  titulo: z.string().min(1),
  /** `Date.toISOString()` del momento en que se guardó o se volvió a resolver. */
  fecha: z.string(),
  estado: esquemaEstadoSimplex,
});

export type EntradaHistorial = z.infer<typeof esquemaEntradaHistorial>;

/** El historial completo: un array de entradas, más reciente primero. */
export const esquemaHistorial = z.array(esquemaEntradaHistorial);
