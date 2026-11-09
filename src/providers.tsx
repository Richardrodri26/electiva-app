"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { crearQueryClient } from "@/lib/query-client";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Agrupa todos los providers globales de la app:
 * - TanStack Query: caché de resultados del solver y del historial.
 * - nuqs: lectura/escritura de estado en la URL (?m=, ?vista=, etc).
 * - next-themes: temas "papel" (claro) y "pizarra" (oscuro). Internamente
 *   next-themes sigue usando los identificadores "light"/"dark"/"system"
 *   (son los únicos que su detección de preferencia del sistema reconoce),
 *   pero `value` los traduce a las clases reales que necesita el CSS:
 *   "papel" y "pizarra".
 * - TooltipProvider de shadcn (pendiente desde que se instaló el componente
 *   `tooltip`).
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => crearQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          value={{ light: "papel", dark: "pizarra" }}
        >
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
