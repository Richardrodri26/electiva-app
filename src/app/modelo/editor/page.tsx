/**
 * Ruta `/modelo/editor` (docs/06-ux-ui.md §3.3): editor técnico directo.
 *
 * Server component: metadata + `<Suspense>` (nuqs lee `?m=` en cliente).
 */

import type { Metadata } from "next";
import { Suspense } from "react";

import { PaginaEditor } from "@/features/editor/pagina-editor";

export const metadata: Metadata = {
  title: "Editor del modelo — Programación lineal",
  description: "Escriba directamente la función objetivo y las restricciones de su modelo.",
};

export default function EditorPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8">
      <Suspense>
        <PaginaEditor />
      </Suspense>
    </main>
  );
}
