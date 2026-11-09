/**
 * Ruta `/resolver` (docs/02-arquitectura.md §3.4): pantalla de resultados.
 *
 * Server component: solo metadata + `<Suspense>` (nuqs lee `searchParams` en cliente,
 * requiere Suspense — docs/02 §3.1). Toda la lógica vive en `features/resultados/`.
 */

import type { Metadata } from "next";
import { Suspense } from "react";

import { PaginaResolver } from "@/features/resultados/pagina-resolver";

export const metadata: Metadata = {
  title: "Resultados — Programación lineal",
  description:
    "Resolvé tu modelo de programación lineal por el método gráfico o por Simplex, viendo cada paso como en clase.",
};

export default function ResolverPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
      <Suspense>
        <PaginaResolver />
      </Suspense>
    </main>
  );
}
