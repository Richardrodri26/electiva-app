/**
 * Hook `useSolucionSimplex` (`features/resultados/use-solucion-simplex.ts`) —
 * docs/02-arquitectura.md §3.2.
 *
 * `resolverSimplex` es puro y síncrono (dominio puro, AGENTS.md regla de oro #1), pero se
 * envuelve en `useQuery` para cachear el resultado por `hashModelo` y no recalcularlo en
 * cada render (y para poder moverlo a un Web Worker después sin tocar la UI, docs/02 §3.2).
 * Clave `['solucion', 'simplex', hashModelo]`. `staleTime`/`gcTime`/`retry` quedan en los
 * defaults globales de `crearQueryClient` (el resultado es determinista).
 *
 * Autoguardado en el historial (tarea T7.1, docs/02 §3.2: "Guardado automático en historial:
 * efecto en la vista de resultados cuando la query de Simplex termina con éxito"). Se guarda
 * TODO modelo resuelto sin excepción, incluidos `infactible`/`no_acotado`/`limite_iteraciones`
 * (decisión confirmada: no solo los óptimos) — "resuelto con éxito" es que `resolverSimplex`
 * no haya lanzado, no que el `estado` final sea óptimo. El efecto depende del hash (string
 * estable), no del objeto `modelo` (nuqs puede dar una instancia nueva por render con el mismo
 * contenido): así se guarda una sola vez por modelo distinto, no en cada render.
 */

"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { resolverSimplex } from "@/dominio/simplex/resolver";
import type { ResultadoSimplex } from "@/dominio/simplex/tipos";

import { useGuardarEnHistorial } from "@/features/historial/use-historial";

export function useSolucionSimplex(modelo: ModeloLineal) {
  const hash = hashModelo(modelo);
  const resultado = useQuery<ResultadoSimplex>({
    queryKey: ["solucion", "simplex", hash],
    queryFn: async () => resolverSimplex(modelo),
  });

  const guardarEnHistorial = useGuardarEnHistorial();
  useEffect(() => {
    if (resultado.status === "success") {
      guardarEnHistorial.mutate({ modelo, estado: resultado.data.estado });
    }
    // Solo debe repetirse cuando CAMBIA el modelo resuelto (el hash) o cuando la resolución
    // pasa a "success"; `modelo` y `guardarEnHistorial.mutate` se leen adentro pero no deben
    // disparar el efecto por sí mismos (mismo patrón que `use-borrador-editor.ts`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado.status, hash]);

  return resultado;
}
