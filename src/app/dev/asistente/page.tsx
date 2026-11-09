/**
 * Página interna de desarrollo (`/dev/asistente`) — T5.1 de
 * docs/07-plan-de-implementacion.md.
 *
 * Muestra el asistente (pasos 1 a 4, `src/features/asistente/`) para revisarlo
 * visualmente antes de integrarlo en la ruta real `/modelo/asistente` (otra tarea). Al
 * completar el paso 4 se ve el `ModeloLineal` resultante en crudo, para verificar a ojo
 * que coincide con lo capturado. No es parte del producto: llama a `notFound()` en
 * producción, igual que `/dev/componentes`.
 */

"use client";

import { Suspense, useState } from "react";
import { notFound } from "next/navigation";

import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { formatearModeloTexto } from "@/dominio/modelo/formato";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asistente } from "@/features/asistente/asistente";

export default function AsistenteDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted-foreground">Página interna de desarrollo</p>
        <h1 className="text-2xl font-bold">Asistente — pasos 1 a 4</h1>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          Vista de revisión de <code>src/features/asistente/</code>. No disponible en producción.
        </p>
      </header>

      <Suspense>
        <AsistenteDeDesarrollo />
      </Suspense>
    </main>
  );
}

function AsistenteDeDesarrollo() {
  const [modelo, setModelo] = useState<ModeloLineal | null>(null);

  return (
    <>
      <Asistente onModeloCompleto={setModelo} />

      {modelo ? (
        <Card>
          <CardHeader>
            <CardTitle>Modelo resultante</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{formatearModeloTexto(modelo)}</pre>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
