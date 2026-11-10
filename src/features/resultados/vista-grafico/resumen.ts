/**
 * Resumen textual accesible de la gráfica (`features/resultados/vista-grafico/resumen.ts`) —
 * docs/05-metodo-grafico.md §5: "resumen textual de la gráfica (`aria-describedby`) con
 * vértices y óptimo; la tabla es la alternativa equivalente". Se usa como `ariaDescription`
 * del `<Chart>` (el prop que expone `@tanstack/charts/react` para esto — ver
 * `docs/framework/react/reference/chart.md` §"Accessibility and sizing") y también se
 * muestra en texto visible debajo de la gráfica (útil para cualquier lector, no solo quien
 * usa lector de pantalla).
 *
 * Dominio puro aparte (no vive en `src/dominio/**` porque mezcla vocabulario de presentación
 * de esta pestaña puntual, pero no depende de React: sigue sin `number` para decisiones,
 * solo formatea texto a partir de `Fraccion` ya decidida por `resolverGrafico`).
 */

import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { ResultadoGrafico, Vertice } from "@/dominio/grafico/tipos";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

function etiquetaPunto(v: Vertice, formato: FormatoNumero): string {
  const x1 = formatearValorNumerico(v.punto.x1, formato);
  const x2 = formatearValorNumerico(v.punto.x2, formato);
  return `${v.id} = (${x1}, ${x2})`;
}

export function construirResumenAccesible(
  resultado: ResultadoGrafico,
  modelo: ModeloLineal,
  formato: FormatoNumero,
): string {
  const [nombreX1, nombreX2] = modelo.variables.map((v) => v.nombre);

  if (resultado.estado === "infactible") {
    return "Ningún punto cumple todas las restricciones a la vez: no hay región factible que graficar.";
  }

  const cantidad = resultado.vertices.length;
  const formaRegion =
    cantidad >= 3 ? `un polígono de ${cantidad} vértices` : cantidad === 2 ? "un segmento" : "un único punto";
  const baseRegion = `La región factible de ${nombreX1} y ${nombreX2} es ${formaRegion}${
    resultado.regionAcotada ? "" : ", y no está acotada"
  }.`;

  if (resultado.estado === "no_acotado") {
    return `${baseRegion} Z puede crecer sin límite en la dirección que mejora el objetivo: el modelo no tiene un óptimo finito.`;
  }

  if (resultado.estado === "optimos_alternativos") {
    const optimos = resultado.vertices.filter((v) => v.esOptimo);
    const zTexto = resultado.optimo ? formatearValorNumerico(resultado.optimo.z, formato) : "";
    const puntos = optimos.map((v) => etiquetaPunto(v, formato)).join(" y ");
    return `${baseRegion} Hay más de una solución óptima, todas con Z = ${zTexto}: por ejemplo en ${puntos}.`;
  }

  // estado === "optimo"
  const optimo = resultado.vertices.find((v) => v.esOptimo);
  if (optimo === undefined || resultado.optimo === undefined) {
    return baseRegion;
  }
  const zTexto = formatearValorNumerico(resultado.optimo.z, formato);
  return `${baseRegion} El óptimo está en el vértice ${etiquetaPunto(optimo, formato)}, con Z = ${zTexto}.`;
}
