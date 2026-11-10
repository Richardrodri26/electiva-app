/**
 * `<VistaImpresion>` — T7.2 (docs/06-ux-ui.md §5): contenido que solo se ve al imprimir.
 *
 * Imprime el modelo, TODAS las tablas del Simplex (no solo la iteración visible) y la gráfica
 * (si el modelo tiene 2 variables). En pantalla permanece oculto (`hidden print:flex`).
 */

"use client";

import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import { useSolucionSimplex } from "./use-solucion-simplex";
import { VistaGrafico } from "./vista-grafico";
import { VistaModelo } from "./vista-modelo";
import { TablaSimplexView } from "./vista-simplex/tabla-simplex";

export interface VistaImpresionProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaImpresion({ modelo, formato }: VistaImpresionProps) {
  const resultadoQuery = useSolucionSimplex(modelo);
  const resultado = resultadoQuery.data;

  const tablas = resultado === undefined ? [] : resultado.tablas;
  const alternativa = resultado?.alternativa;
  const total = tablas.length + (alternativa === undefined ? 0 : 1);

  return (
    <div className="hidden flex-col gap-6 print:flex">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Modelo</h2>
        <VistaModelo modelo={modelo} formato={formato} />
      </section>

      {resultado !== undefined ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Método Simplex</h2>
          {tablas.map((tabla, indice) => (
            <div key={`principal-${tabla.indice}`} className="break-inside-avoid">
              <TablaSimplexView
                tabla={tabla}
                columnas={resultado.columnas}
                formato={formato}
                posicion={indice + 1}
                total={total}
              />
            </div>
          ))}
          {alternativa !== undefined ? (
            <div className="break-inside-avoid">
              <TablaSimplexView
                tabla={alternativa.tabla}
                columnas={resultado.columnas}
                formato={formato}
                posicion={total}
                total={total}
                etiquetaExtra="Solución alternativa"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {modelo.variables.length === 2 ? (
        <section className="flex flex-col gap-2 break-inside-avoid">
          <h2 className="text-lg font-semibold">Método gráfico</h2>
          <VistaGrafico modelo={modelo} formato={formato} />
        </section>
      ) : null}
    </div>
  );
}
