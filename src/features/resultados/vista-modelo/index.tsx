/**
 * Pestaña "Modelo" (`features/resultados/vista-modelo/index.tsx`) — docs/07-plan-de-implementacion.md
 * T6.2: notación matemática completa + "Copiar como texto". ESQUELETO ÚNICAMENTE (tarea T6.1):
 * el contenido real es una tarea futura por separado; esto es un placeholder para que esa
 * tarea no tenga que tocar el layout compartido (`features/resultados/resultados-layout.tsx`).
 */

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

export interface VistaModeloProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaModelo({ modelo, formato }: VistaModeloProps) {
  return (
    <EstadoVacio
      titulo="Esta pestaña todavía no está lista"
      descripcion={`La notación matemática completa del modelo (${modelo.variables.length} variables, formato ${formato}) y "Copiar como texto" llegan en una tarea aparte (T6.2).`}
    />
  );
}
