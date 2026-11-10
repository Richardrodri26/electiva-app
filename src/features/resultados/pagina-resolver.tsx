/**
 * `<PaginaResolver>` (`features/resultados/pagina-resolver.tsx`) — punto de entrada de
 * `/resolver` (docs/02-arquitectura.md §3.4, T6.1 de docs/07-plan-de-implementacion.md).
 *
 * Lee `?m=` con el parser compartido (`lib/url-state.ts`). Si falta o no valida, muestra
 * `ErrorAmable` con las dos acciones de docs/06-ux-ui.md §4 ("URL inválida"): "Abrir editor"
 * e "Ir al inicio". Si valida, delega el layout completo a `<ResultadosLayout>`.
 */

"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";

import { ErrorAmable } from "@/components/comunes/error-amable";
import { buttonVariants } from "@/components/ui/button";
import { CLAVE_MODELO, parseAsModelo } from "@/lib/url-state";
import { ResultadosLayout } from "./resultados-layout";

export function PaginaResolver() {
  const [modelo] = useQueryState(CLAVE_MODELO, parseAsModelo);

  if (modelo === null) {
    return (
      <ErrorAmable
        mensaje="Este enlace no contiene un modelo válido."
        accion={
          <div className="flex flex-wrap gap-2">
            <Link href="/modelo/editor" className={buttonVariants({ className: "h-11 px-4" })}>
              Abrir editor
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}>
              Ir al inicio
            </Link>
          </div>
        }
      />
    );
  }

  return <ResultadosLayout modelo={modelo} />;
}
