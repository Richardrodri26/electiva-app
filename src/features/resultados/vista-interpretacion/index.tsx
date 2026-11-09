/**
 * Pestaña "Interpretación" (`features/resultados/vista-interpretacion/index.tsx`) —
 * docs/07-plan-de-implementacion.md T6.5: docs/04-motor-simplex.md §5 + avisos. ESQUELETO
 * ÚNICAMENTE (tarea T6.1): el contenido real es una tarea futura por separado; esto es un
 * placeholder para que esa tarea no tenga que tocar el layout compartido
 * (`features/resultados/resultados-layout.tsx`).
 */

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

export interface VistaInterpretacionProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaInterpretacion({ modelo, formato }: VistaInterpretacionProps) {
  return (
    <EstadoVacio
      titulo="Esta pestaña todavía no está lista"
      descripcion={`Las frases de interpretación en lenguaje cotidiano (modelo de ${modelo.variables.length} variables, formato ${formato}) llegan en una tarea aparte (T6.5).`}
    />
  );
}
