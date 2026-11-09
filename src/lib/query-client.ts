import { QueryClient } from "@tanstack/react-query";

/**
 * Crea una instancia de QueryClient con la configuración por defecto de la app.
 *
 * Resolver un modelo (Simplex o método gráfico) es un cálculo puro y
 * determinista: el mismo modelo siempre da el mismo resultado, así que no
 * tiene sentido revalidarlo ni reintentarlo. `gcTime` limita cuánto tiempo
 * se conserva en caché un resultado que ya no se está mirando.
 */
export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 10 * 60 * 1000,
        retry: false,
      },
    },
  });
}
