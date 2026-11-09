/**
 * Página interna de desarrollo (`/dev/editor`) — T4.2 de docs/07-plan-de-implementacion.md.
 *
 * Muestra el editor técnico directo (`src/features/editor/`) para revisarlo visualmente
 * antes de integrarlo en la ruta real `/modelo/editor` (otra tarea, ver AGENTS.md: la ruta
 * real todavía no existe, igual que `/modelo/asistente` para el asistente). Al resolver se
 * ve la URL final que se armó (`/resolver?m=…&vista=…`), sin navegar de verdad: `/resolver`
 * todavía no existe. No es parte del producto: llama a `notFound()` en producción, igual
 * que `/dev/asistente` y `/dev/componentes`.
 */

"use client";

import { Suspense, useState } from "react";
import { notFound } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Editor } from "@/features/editor/editor";

export default function EditorDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted-foreground">Página interna de desarrollo</p>
        <h1 className="text-2xl font-bold">Editor técnico directo</h1>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          Vista de revisión de <code>src/features/editor/</code>. No disponible en producción.
        </p>
      </header>

      <Suspense>
        <EditorDeDesarrollo />
      </Suspense>
    </main>
  );
}

function EditorDeDesarrollo() {
  const [urlResultado, setUrlResultado] = useState<string | null>(null);

  return (
    <>
      <Editor onResolver={setUrlResultado} />

      {urlResultado !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>URL resultante</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all text-sm">{urlResultado}</p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
