import { z } from "zod";

import { esquemaModelo } from "@/dominio/modelo/esquemas";

/**
 * Forma de una entrada de `public/ejemplos.json` (docs/08-casos-de-prueba.md §2).
 * `modelo` usa el mismo `esquemaModelo` que el asistente y el editor: un ejemplo que no
 * valida es un error de datos, no se descarta en silencio.
 */
export const esquemaEjemplo = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  modelo: esquemaModelo,
});

export const esquemaEjemplos = z.array(esquemaEjemplo);

export type Ejemplo = z.output<typeof esquemaEjemplo>;

/** Valida el contenido ya parseado de `ejemplos.json`. Lanza `ZodError` si algún ejemplo no valida. */
export function parsearEjemplos(datos: unknown): Ejemplo[] {
  return esquemaEjemplos.parse(datos);
}
