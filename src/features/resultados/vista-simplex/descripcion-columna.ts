/**
 * Descripción de una columna de la tabla Simplex, para el tooltip del encabezado
 * (`features/resultados/vista-simplex/descripcion-columna.ts`), docs/06-ux-ui.md §3.4:
 * "encabezados con tooltip (S₁: holgura de la restricción 1 — lo que sobra)".
 */

import type { ColumnaTabla } from "@/dominio/simplex/tipos";

export function describirColumna(columna: ColumnaTabla): string {
  switch (columna.tipo) {
    case "decision":
      return `${columna.id}: variable de decisión.`;
    case "holgura":
      return `${columna.id}: holgura de la restricción ${columna.restriccion} — lo que sobra.`;
    case "exceso":
      return `${columna.id}: exceso de la restricción ${columna.restriccion} — lo que se pasa del mínimo.`;
    case "artificial":
      return `${columna.id}: variable artificial de la restricción ${columna.restriccion} — un recurso matemático para arrancar la tabla, sin significado en el problema real.`;
  }
}
