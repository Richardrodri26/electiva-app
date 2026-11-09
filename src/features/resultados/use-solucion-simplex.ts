/**
 * Hook `useSolucionSimplex` (`features/resultados/use-solucion-simplex.ts`) —
 * docs/02-arquitectura.md §3.2.
 *
 * `resolverSimplex` es puro y síncrono (dominio puro, AGENTS.md regla de oro #1), pero se
 * envuelve en `useQuery` para cachear el resultado por `hashModelo` y no recalcularlo en
 * cada render (y para poder moverlo a un Web Worker después sin tocar la UI, docs/02 §3.2).
 * Clave `['solucion', 'simplex', hashModelo]`. `staleTime`/`gcTime`/`retry` quedan en los
 * defaults globales de `crearQueryClient` (el resultado es determinista).
 */

"use client";

import { useQuery } from "@tanstack/react-query";

import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { resolverSimplex } from "@/dominio/simplex/resolver";
import type { ResultadoSimplex } from "@/dominio/simplex/tipos";

export function useSolucionSimplex(modelo: ModeloLineal) {
  return useQuery<ResultadoSimplex>({
    queryKey: ["solucion", "simplex", hashModelo(modelo)],
    queryFn: async () => resolverSimplex(modelo),
  });
}
