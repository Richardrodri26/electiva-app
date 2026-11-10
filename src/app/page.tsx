/**
 * Ruta `/` (docs/06-ux-ui.md §3.1): pantalla de Inicio. Toda la lógica vive en `features/inicio/`.
 */

import { Inicio } from "@/features/inicio/inicio";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
      <Inicio />
    </main>
  );
}
