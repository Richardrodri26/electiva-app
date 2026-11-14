/**
 * `<PaginaEditor>` (`features/editor/pagina-editor.tsx`) — ruta real `/modelo/editor`
 * (docs/06-ux-ui.md §2 y §3.3). Precarga `?m=` (lo resuelve `<Editor>` vía `useBorradorEditor`)
 * y, al resolver, navega de verdad a `/resolver?m=…&vista=…`.
 */

"use client";

import { useRouter } from "next/navigation";

import { useClaveDeReaparicion } from "@/lib/use-clave-de-reaparicion";

import { Editor } from "./editor";

export function PaginaEditor() {
  const router = useRouter();
  // Next conserva el estado de la pantalla al navegar (ver `use-clave-de-reaparicion.ts`):
  // la clave remonta el editor al volver, para no heredar el ejercicio anterior.
  const clave = useClaveDeReaparicion();

  return <Editor key={clave} onResolver={(url) => router.push(url)} />;
}
