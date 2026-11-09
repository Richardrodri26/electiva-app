/**
 * Pestaña "Simplex" (`features/resultados/vista-simplex/index.tsx`) — docs/07-plan-de-implementacion.md
 * T6.3: preparación plegable, stepper con `?iter=`, tabla con TanStack Table, resaltado y
 * animación del resaltador, explicación, operaciones, detalle celda a celda, estados finales,
 * alternativa. ESQUELETO ÚNICAMENTE (tarea T6.1): el contenido real es una tarea futura por
 * separado; esto es un placeholder para que esa tarea no tenga que tocar el layout compartido
 * (`features/resultados/resultados-layout.tsx`).
 */

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

export interface VistaSimplexProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaSimplex({ modelo, formato }: VistaSimplexProps) {
  return (
    <EstadoVacio
      titulo="Esta pestaña todavía no está lista"
      descripcion={`Las tablas del Simplex paso a paso (${modelo.restricciones.length} restricciones, formato ${formato}) llegan en una tarea aparte (T6.3).`}
    />
  );
}
