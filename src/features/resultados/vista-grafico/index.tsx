/**
 * Pestaña "Método gráfico" (`features/resultados/vista-grafico/index.tsx`) —
 * docs/07-plan-de-implementacion.md T6.4: docs/05-metodo-grafico.md §4-5 con TanStack Charts
 * + tabla de vértices enlazada + recta de nivel + recorrido. ESQUELETO ÚNICAMENTE (tarea T6.1):
 * el contenido real es una tarea futura por separado; esto es un placeholder para que esa
 * tarea no tenga que tocar el layout compartido (`features/resultados/resultados-layout.tsx`).
 * El layout ya se encarga de no mostrar esta pestaña como seleccionable si el modelo no
 * tiene exactamente 2 variables (requisito del método gráfico).
 */

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

export interface VistaGraficoProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaGrafico({ modelo, formato }: VistaGraficoProps) {
  return (
    <EstadoVacio
      titulo="Esta pestaña todavía no está lista"
      descripcion={`La gráfica y la tabla de vértices (variables: ${modelo.variables.map((v) => v.etiqueta).join(", ")}, formato ${formato}) llegan en una tarea aparte (T6.4).`}
    />
  );
}
