import { useQuery } from "@tanstack/react-query";

import { parsearEjemplos, type Ejemplo } from "./ejemplos";

export const RUTA_EJEMPLOS = "/ejemplos.json";

/**
 * Descarga y valida los ejemplos de clase. Si el HTTP falla o algún modelo no valida,
 * la promesa rechaza: TanStack Query lo expone como `isError`.
 */
export async function cargarEjemplos(): Promise<Ejemplo[]> {
  const respuesta = await fetch(RUTA_EJEMPLOS);
  if (!respuesta.ok) {
    throw new Error(`No se pudieron cargar los ejemplos (HTTP ${respuesta.status}).`);
  }
  const datos: unknown = await respuesta.json();
  return parsearEjemplos(datos);
}

/** Clave `['ejemplos']` (docs/02-arquitectura.md §3.2). El archivo es estático: no se revalida. */
export function useEjemplos() {
  return useQuery({
    queryKey: ["ejemplos"],
    queryFn: cargarEjemplos,
    staleTime: Infinity,
    retry: false,
  });
}
