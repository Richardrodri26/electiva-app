/**
 * Hook `useSolucionGrafico` (`features/resultados/use-solucion-grafico.ts`) —
 * docs/02-arquitectura.md §3.2.
 *
 * Igual que `useSolucionSimplex`, pero para `resolverGrafico` (`dominio/grafico/resolver.ts`).
 * `resolverGrafico` solo acepta modelos de exactamente 2 variables (docs/05-metodo-grafico.md:
 * llamarlo con otra cantidad es un error de programación, no un caso de usuario) — `enabled`
 * evita ejecutar la query cuando la pestaña "Método gráfico" está deshabilitada.
 */

"use client";

import { useQuery } from "@tanstack/react-query";

import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { resolverGrafico } from "@/dominio/grafico/resolver";
import type { ResultadoGrafico } from "@/dominio/grafico/tipos";

export function useSolucionGrafico(modelo: ModeloLineal) {
  return useQuery<ResultadoGrafico>({
    queryKey: ["solucion", "grafico", hashModelo(modelo)],
    queryFn: async () => resolverGrafico(modelo),
    enabled: modelo.variables.length === 2,
  });
}
