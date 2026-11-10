/**
 * `<PaginaEditor>` (`features/editor/pagina-editor.tsx`) — ruta real `/modelo/editor`
 * (docs/06-ux-ui.md §2 y §3.3). Precarga `?m=` (lo resuelve `<Editor>` vía `useBorradorEditor`)
 * y, al resolver, navega de verdad a `/resolver?m=…&vista=…`.
 */

"use client";

import { useRouter } from "next/navigation";

import { Editor } from "./editor";

export function PaginaEditor() {
  const router = useRouter();

  return <Editor onResolver={(url) => router.push(url)} />;
}
