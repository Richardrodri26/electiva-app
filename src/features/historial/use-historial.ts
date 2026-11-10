/**
 * Hooks de TanStack Query sobre `almacen-historial.ts` (`features/historial/use-historial.ts`) —
 * docs/02-arquitectura.md §3.2: "Historial: `useMutation` para guardar/renombrar/eliminar con
 * `invalidateQueries(['historial'])`".
 *
 * `useHistorial` cachea la lectura de `localStorage` bajo la clave `['historial']`; cada
 * mutación (guardar, renombrar, eliminar) invalida esa clave al terminar, así que cualquier
 * componente que la esté mirando (el panel del historial, "Guardar con nombre", una futura
 * sección "Recientes") se actualiza solo, sin pasarse callbacks entre sí.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ModeloLineal } from "@/dominio/modelo/tipos";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";

import {
  eliminarEntrada,
  guardarEnHistorial,
  obtenerHistorial,
  renombrarEntrada,
} from "./almacen-historial";
import type { EntradaHistorial } from "./tipos";

/** Clave de Query del historial (docs/02 §3.2: `['historial']`). */
export const CLAVE_QUERY_HISTORIAL = ["historial"] as const;

/** Lista del historial, más reciente primero. */
export function useHistorial() {
  return useQuery<EntradaHistorial[]>({
    queryKey: CLAVE_QUERY_HISTORIAL,
    queryFn: async () => obtenerHistorial(),
  });
}

interface GuardarEnHistorialVariables {
  modelo: ModeloLineal;
  estado: EstadoSimplex;
  /** Si se pasa (ej. "Guardar con nombre"), se usa tal cual; si no, ver `guardarEnHistorial`. */
  titulo?: string;
}

/** Guarda o actualiza una entrada (autoguardado al resolver, o "Guardar con nombre"). */
export function useGuardarEnHistorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelo, estado, titulo }: GuardarEnHistorialVariables) =>
      guardarEnHistorial(modelo, estado, titulo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_QUERY_HISTORIAL });
    },
  });
}

/** Renombra una entrada del historial. */
export function useRenombrarEntradaHistorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ hash, titulo }: { hash: string; titulo: string }) =>
      renombrarEntrada(hash, titulo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_QUERY_HISTORIAL });
    },
  });
}

/** Elimina una entrada del historial. */
export function useEliminarEntradaHistorial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hash: string) => eliminarEntrada(hash),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLAVE_QUERY_HISTORIAL });
    },
  });
}
