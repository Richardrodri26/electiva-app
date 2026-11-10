/**
 * Ruta `/modelo/asistente?paso=1..5` (docs/06-ux-ui.md §3.2): asistente en lenguaje cotidiano.
 *
 * Al generar el modelo, el paso 5 ("Resolver modelo") navega solo a `/resolver?m=…&vista=modelo`.
 * Server component: metadata + `<Suspense>` (nuqs lee `?paso=` en cliente).
 */

import type { Metadata } from "next";
import { Suspense } from "react";

import { Asistente } from "@/features/asistente/asistente";

export const metadata: Metadata = {
  title: "Asistente — Programación lineal",
  description: "Describa su situación con preguntas sencillas y arme el modelo paso a paso.",
};

export default function AsistentePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <Suspense>
        <Asistente />
      </Suspense>
    </main>
  );
}
