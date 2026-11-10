/**
 * `<Grafica>` (`features/resultados/vista-grafico/grafica.tsx`) — el gráfico de TanStack
 * Charts de la pestaña "Método gráfico" (docs/05-metodo-grafico.md §4.1 y §5).
 *
 * Capas (de atrás hacia adelante, docs/05 §4.1): cuadrícula/ejes (los pone el propio
 * `<Chart>` vía `scales.x/y`) → región factible → rectas de restricciones → recta de nivel
 * (+ flecha de mejora) → recorrido del Simplex (opcional) → puntos enteros (opcional) →
 * vértices → óptimo. El orden del array `marks` es el orden de pintado.
 *
 * Solo los vértices (normales + óptimo) son interactivos: todo lo demás se envuelve en
 * `decorative()` (`@tanstack/charts/mark/decorative`) para que no compita por el foco/tooltip
 * ni aparezca como "punto" fantasma en la navegación por teclado (docs/05 §5 punto 3: el
 * tooltip personalizado de abajo asume que SIEMPRE es un vértice).
 *
 * Región factible — plan B de docs/05 §5.1 (ver `geometria.ts` para el por qué): no hay una
 * marca pública de "polígono" en `@tanstack/charts` v1.5.0, así que se usa `areaY` con
 * `y1`/`y2`. Con una región NO acotada se omite el relleno (ver nota en el cuerpo del
 * componente) — simplificación de alcance documentada en el resumen final de la tarea.
 */

"use client";

import { useMemo } from "react";
import { defineChart, dot, lineY, text } from "@tanstack/charts";
import { areaY } from "@tanstack/charts/area";
import { arrow } from "@tanstack/charts/arrow";
import { decorative } from "@tanstack/charts/mark/decorative";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { Chart } from "@tanstack/charts/react";

import { parsearFraccion } from "@/dominio/aritmetica/parseo";
import type { ResultadoGrafico } from "@/dominio/grafico/tipos";
import type { PuntoRecorridoSimplex } from "@/dominio/simplex/interpretar";
import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import {
  calcularEnvolvente,
  calcularFlechaMejora,
  calcularSegmentoLinea,
  puntoANumero,
  puntoMedio,
} from "./geometria";
import { construirResumenAccesible } from "./resumen";

export interface GraficaProps {
  resultado: ResultadoGrafico;
  modelo: ModeloLineal;
  formato: FormatoNumero;
  /** Posición actual de la recta de nivel (docs/05 §4.1), en unidades de Z, no en píxeles. */
  nivelZ: number;
  mostrarRecorrido: boolean;
  recorrido: readonly PuntoRecorridoSimplex[];
  /** Id del vértice resaltado desde la tabla (o `null`), para el enlace bidireccional. */
  verticeResaltado: string | null;
  onCambiarFoco: (id: string | null) => void;
}

/** Fila interna de los vértices: coordenadas numéricas (solo para graficar) + texto exacto (para el tooltip). */
interface FilaVertice {
  id: string;
  x1: number;
  x2: number;
  x1Texto: string;
  x2Texto: string;
  zTexto: string;
  esOptimo: boolean;
}

function colorRecta(numero: number): string {
  return `var(--chart-${((numero - 1) % 6) + 1})`;
}

export function Grafica({
  resultado,
  modelo,
  formato,
  nivelZ,
  mostrarRecorrido,
  recorrido,
  verticeResaltado,
  onCambiarFoco,
}: GraficaProps) {
  const definicion = useMemo(() => {
    const dominioX1 = resultado.dominio.x1;
    const dominioX2 = resultado.dominio.x2;
    // Dominio COMPARTIDO para ambas escalas (en vez de `dominioX1`/`dominioX2` cada una con su
    // propio máximo): docs/05-metodo-grafico.md §5 pide "el mismo dominio calculado en §2 paso
    // 8" y "aspecto ≈ 1:1", que con dominios distintos por eje no es realmente 1:1 (sería un
    // rectángulo). Además, usar un dominio Y estrictamente MENOR que el de X dispara un defecto
    // real de `@tanstack/charts` v1.5.0 (confirmado empíricamente, ver resumen final de la
    // tarea): el rango en píxeles del eje Y colapsa a casi cero cuando su dominio máximo es
    // menor al del eje X, con instancias de escala fijas en ambos ejes. Un dominio compartido
    // (además de ser lo que pide la especificación) evita ese defecto.
    const dominioCompartido: [number, number] = [0, Math.max(dominioX1[1], dominioX2[1])];
    const [variableX1, variableX2] = modelo.variables;
    const c1 = parsearFraccion(modelo.objetivo.coeficientes[0]!).aNumero();
    const c2 = parsearFraccion(modelo.objetivo.coeficientes[1]!).aNumero();

    const filasVertices: FilaVertice[] = resultado.vertices.map((v) => {
      const { x1, x2 } = puntoANumero(v.punto);
      return {
        id: v.id,
        x1,
        x2,
        x1Texto: formatearValorNumerico(v.punto.x1, formato),
        x2Texto: formatearValorNumerico(v.punto.x2, formato),
        zTexto: formatearValorNumerico(v.z, formato),
        esOptimo: v.esOptimo,
      };
    });

    // Sin anotación de tipo a propósito: TypeScript infiere un "evolving array" (unión de
    // cada `push`) porque el array mezcla marcas de distinto tipo (`dot`, `lineY`, `areaY`,
    // `arrow`, `text`, y sus versiones `decorative(...)`) armadas condicionalmente — no se
    // puede expresar como un literal único como en los ejemplos de la documentación. La
    // alternativa sería `ChartMark<any, any, any, any, any, any, any>[]` (el propio tipo
    // público `decorative()` de la librería usa exactamente esa forma para "cualquier
    // marca"), pero AGENTS.md pide cero `any` en el código propio.
    const marks = [];

    // --- Región factible (docs/05 §4.1, plan B de §5.1 — ver cabecera del archivo) ---
    if (resultado.vertices.length >= 3 && resultado.regionAcotada) {
      const envolvente = calcularEnvolvente(resultado.vertices);
      marks.push(
        decorative(
          areaY(envolvente, {
            id: "region-factible",
            x: "x1",
            y1: "inferior",
            y2: "superior",
            fill: "var(--primary)",
            fillOpacity: 0.18,
            stroke: "var(--primary)",
            strokeWidth: 1,
          }),
        ),
      );
    } else if (resultado.vertices.length === 2) {
      // docs/05 §4.1: "si hay restricciones =, la región es un segmento: dibujarlo grueso".
      const puntosSegmento = resultado.vertices.map((v) => puntoANumero(v.punto));
      const a = puntosSegmento[0]!;
      const b = puntosSegmento[1]!;
      marks.push(
        decorative(
          lineY([a, b], {
            id: "region-segmento",
            x: "x1",
            y: "x2",
            stroke: "var(--primary)",
            strokeWidth: 6,
            lineCap: "round",
          }),
        ),
      );
    }
    // Región no acotada (`!resultado.regionAcotada`): no se rellena (el lado que "cerraría"
    // el polígono entre el último y el primer vértice no existe en una región abierta). Se
    // documenta como simplificación de alcance en el resumen final de la tarea.

    // --- Rectas de restricciones (una por restricción; los ejes no se dibujan: coinciden
    // con los ejes x1=0/x2=0 que ya dibuja el propio `<Chart>`) ---
    for (const recta of resultado.rectas) {
      if (typeof recta.restriccion !== "number") {
        continue;
      }
      const segmento = calcularSegmentoLinea(
        recta.a1.aNumero(),
        recta.a2.aNumero(),
        recta.b.aNumero(),
        dominioX1,
        dominioX2,
      );
      if (segmento === null) {
        continue;
      }
      marks.push(
        decorative(
          lineY([segmento.desde, segmento.hasta], {
            id: `recta-${recta.restriccion}`,
            x: "x1",
            y: "x2",
            stroke: colorRecta(recta.restriccion),
            strokeWidth: 2,
          }),
        ),
      );
      marks.push(
        decorative(
          text([{ ...segmento.hasta, etiqueta: `R${recta.restriccion}` }], {
            x: "x1",
            y: "x2",
            text: "etiqueta",
            fill: colorRecta(recta.restriccion),
            fontSize: 11,
            fontWeight: 600,
            dy: -6,
          }),
        ),
      );
    }

    // --- Recta de nivel de Z + flecha de mejora (docs/05 §4.1) ---
    const segmentoNivel = calcularSegmentoLinea(c1, c2, nivelZ, dominioX1, dominioX2);
    if (segmentoNivel !== null) {
      marks.push(
        decorative(
          lineY([segmentoNivel.desde, segmentoNivel.hasta], {
            id: "recta-nivel",
            x: "x1",
            y: "x2",
            stroke: "var(--foreground)",
            strokeOpacity: 0.7,
            strokeWidth: 2,
            strokeDasharray: "6 4",
          }),
        ),
      );

      const anclaje = puntoMedio(segmentoNivel);
      const longitudFlecha = Math.max(dominioX1[1], dominioX2[1]) * 0.08;
      const flecha = calcularFlechaMejora(c1, c2, modelo.objetivo.sentido, anclaje, longitudFlecha);
      if (flecha !== null) {
        marks.push(
          decorative(
            arrow(
              [{ x1: flecha.desde.x1, y1: flecha.desde.x2, x2: flecha.hasta.x1, y2: flecha.hasta.x2 }],
              {
                id: "flecha-mejora",
                x1: "x1",
                y1: "y1",
                x2: "x2",
                y2: "y2",
                stroke: "var(--entra)",
                strokeWidth: 2,
                headLength: 8,
              },
            ),
          ),
        );
      }
    }

    // --- Recorrido del Simplex (opcional, docs/05 §4.1) ---
    if (mostrarRecorrido && recorrido.length > 0) {
      const filasRecorrido = recorrido.map((p, indice) => ({
        orden: indice,
        x1: p.x1.aNumero(),
        x2: p.x2.aNumero(),
        factible: p.factible,
      }));

      const segmentos = filasRecorrido.slice(0, -1).map((p, indice) => ({
        x1: p.x1,
        y1: p.x2,
        x2: filasRecorrido[indice + 1]!.x1,
        y2: filasRecorrido[indice + 1]!.x2,
      }));
      if (segmentos.length > 0) {
        marks.push(
          decorative(
            arrow(segmentos, {
              id: "recorrido-flechas",
              x1: "x1",
              y1: "y1",
              x2: "x2",
              y2: "y2",
              stroke: "var(--chart-3)",
              strokeWidth: 1.5,
              strokeOpacity: 0.85,
              headLength: 6,
            }),
          ),
        );
      }

      const factibles = filasRecorrido.filter((p) => p.factible);
      const noFactibles = filasRecorrido.filter((p) => !p.factible);
      if (factibles.length > 0) {
        marks.push(
          decorative(
            dot(factibles, {
              id: "recorrido-factibles",
              x: "x1",
              y: "x2",
              r: 4,
              fill: "var(--chart-3)",
            }),
          ),
        );
      }
      if (noFactibles.length > 0) {
        marks.push(
          decorative(
            dot(noFactibles, {
              id: "recorrido-no-factibles",
              x: "x1",
              y: "x2",
              r: 4,
              fill: "var(--background)",
              stroke: "var(--chart-3)",
              strokeWidth: 1.5,
            }),
          ),
        );
      }
      marks.push(
        decorative(
          text(filasRecorrido, {
            id: "recorrido-numeros",
            x: "x1",
            y: "x2",
            text: (fila) => String(fila.orden),
            fill: "var(--chart-3)",
            fontSize: 10,
            fontWeight: 700,
            dx: 7,
            dy: 7,
          }),
        ),
      );
    }

    // --- Puntos enteros (solo si el modelo es de naturaleza entera y la región es acotada) ---
    if (resultado.puntosEnteros !== undefined && resultado.puntosEnteros.length > 0) {
      const filasEnteros = resultado.puntosEnteros.map((p) => puntoANumero(p.punto));
      marks.push(
        decorative(
          dot(filasEnteros, {
            id: "puntos-enteros",
            x: "x1",
            y: "x2",
            r: 2.5,
            fill: "var(--muted-foreground)",
          }),
        ),
      );
    }
    if (resultado.mejorEntero !== undefined) {
      const mejor = puntoANumero(resultado.mejorEntero.punto);
      marks.push(
        decorative(
          dot([mejor], {
            id: "mejor-entero",
            x: "x1",
            y: "x2",
            r: 8,
            fill: "none",
            stroke: "var(--entra)",
            strokeWidth: 2,
          }),
        ),
      );
    }

    // --- Vértice resaltado desde la tabla (enlace bidireccional, docs/05 §4.2) ---
    const filaResaltada = filasVertices.find((f) => f.id === verticeResaltado);
    if (filaResaltada !== undefined) {
      marks.push(
        decorative(
          dot([filaResaltada], {
            id: "vertice-resaltado",
            x: "x1",
            y: "x2",
            r: filaResaltada.esOptimo ? 12 : 10,
            fill: "none",
            stroke: "var(--primary)",
            strokeWidth: 3,
          }),
        ),
      );
    }

    // --- Vértices (normales y óptimo) — las únicas marcas interactivas (docs/05 §4.1) ---
    const normales = filasVertices.filter((f) => !f.esOptimo);
    const optimos = filasVertices.filter((f) => f.esOptimo);
    if (normales.length > 0) {
      marks.push(
        dot(normales, {
          id: "vertices",
          x: "x1",
          y: "x2",
          key: "id",
          r: 5,
          fill: "var(--primary)",
          stroke: "var(--background)",
          strokeWidth: 1.5,
        }),
      );
    }
    if (optimos.length > 0) {
      marks.push(
        dot(optimos, {
          id: "vertices-optimo",
          x: "x1",
          y: "x2",
          key: "id",
          r: 7,
          fill: "var(--entra)",
          stroke: "var(--background)",
          strokeWidth: 2,
        }),
      );
    }
    if (filasVertices.length > 0) {
      marks.push(
        decorative(
          text(filasVertices, {
            id: "vertices-etiquetas",
            x: "x1",
            y: "x2",
            text: "id",
            fill: "var(--foreground)",
            fontSize: 12,
            fontWeight: 700,
            dx: 9,
            dy: -9,
          }),
        ),
      );
    }

    const etiquetaEje = (nombre: string, etiqueta: string): string =>
      etiqueta !== nombre ? `${nombre} · ${etiqueta}` : nombre;

    return defineChart({
      marks,
      scales: {
        // Instancia ya configurada (NO una factory envuelta en `() => ...`): docs/reference/
        // scales-guides-and-color.md §"Fixed domains" — pasar una función hace que el dominio
        // se infiera de los canales de las marcas (ignorando el `.domain(...)` ya puesto), que
        // es exactamente el bug que esto corrige (la recta de nivel en k=0 agrandaba el eje x2
        // hasta valores muy negativos). Las dos escalas usan `dominioCompartido` (ver más
        // arriba) en vez de `dominioX1`/`dominioX2` por separado.
        x: {
          scale: scaleLinear().domain(dominioCompartido),
          nice: true,
          grid: { stroke: "var(--cuadricula)" },
          axis: {
            label: variableX1 ? etiquetaEje(variableX1.nombre, variableX1.etiqueta) : "x1",
          },
        },
        y: {
          scale: scaleLinear().domain(dominioCompartido),
          nice: true,
          grid: { stroke: "var(--cuadricula)" },
          axis: {
            label: variableX2 ? etiquetaEje(variableX2.nombre, variableX2.etiqueta) : "x2",
          },
        },
      },
      tooltip: {
        use: tooltip,
        items: [
          { id: "vertice", label: "Vértice", text: (punto) => (punto.datum as FilaVertice).id },
          { id: "x1", label: variableX1?.nombre ?? "x1", text: (punto) => (punto.datum as FilaVertice).x1Texto },
          { id: "x2", label: variableX2?.nombre ?? "x2", text: (punto) => (punto.datum as FilaVertice).x2Texto },
          { id: "z", label: "Z", text: (punto) => (punto.datum as FilaVertice).zTexto },
        ],
      },
      focus: "nearest",
    });
  }, [resultado, modelo, formato, nivelZ, mostrarRecorrido, recorrido, verticeResaltado]);

  const resumen = useMemo(
    () => construirResumenAccesible(resultado, modelo, formato),
    [resultado, modelo, formato],
  );

  return (
    <div className="flex flex-col gap-2">
      <Chart
        definition={definicion}
        aspectRatio={1}
        ariaLabel={`Gráfica del método gráfico: ${modelo.variables.map((v) => v.nombre).join(" y ")}`}
        ariaDescription={resumen}
        onFocusChange={(punto) => onCambiarFoco(extraerIdVertice(punto))}
      />
      <p className="text-sm text-muted-foreground">{resumen}</p>
    </div>
  );
}

/** Extrae el `id` del vértice de un `ChartPoint`, o `null` si no hay foco o el punto no es un vértice. */
function extraerIdVertice(punto: { datum: unknown } | null): string | null {
  if (punto === null) {
    return null;
  }
  const { datum } = punto;
  if (typeof datum === "object" && datum !== null && "id" in datum && typeof (datum as { id: unknown }).id === "string") {
    return (datum as { id: string }).id;
  }
  return null;
}
