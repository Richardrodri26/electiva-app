/**
 * Geometría numérica para la pestaña "Método gráfico" (`features/resultados/vista-grafico/geometria.ts`).
 *
 * Conversión a `number` SOLO para alimentar TanStack Charts — docs/05-metodo-grafico.md §5:
 * "Las coordenadas se convierten con Fraccion.aNumero() solo aquí". Nada de esto decide
 * factibilidad u optimalidad: esas decisiones ya las tomó `resolverGrafico` con `Fraccion`
 * exacta (AGENTS.md regla de oro #2). Acá solo se reexpresa la MISMA geometría, ya decidida,
 * en `number` para poder dibujarla.
 *
 * Plan B de docs/05 §5.1 para la región factible: no existe en la API pública de
 * `@tanstack/charts` v1.5.0 una marca de "polígono"/área cerrada arbitraria (ver el resumen
 * final de la tarea para el detalle de qué se confirmó en su documentación), así que se usa
 * `areaY` con `y1`/`y2` (envolvente inferior/superior). La "malla de x1" NO es una grilla
 * fina: son exactamente los quiebres (las coordenadas x1 de los vértices). Entre dos quiebres
 * consecutivos, el borde superior y el inferior del polígono son cada uno UN solo lado (una
 * recta), así que interpolar linealmente entre esos puntos reproduce el polígono EXACTO, no
 * una aproximación. Esto funciona sin calcular una envolvente convexa porque
 * `ResultadoGrafico.vertices` ya viene en orden angular antihorario (docs/05 §2.7): alcanza
 * con recorrer los vértices consecutivos (con vuelta al primero) como los lados reales del
 * polígono.
 */

import type { Punto, Vertice } from "@/dominio/grafico/tipos";

export interface PuntoNumerico {
  x1: number;
  x2: number;
}

export interface SegmentoNumerico {
  desde: PuntoNumerico;
  hasta: PuntoNumerico;
}

/** Única conversión de `Fraccion` a `number` de toda la pestaña (docs/05 §5). */
export function puntoANumero(punto: Punto): PuntoNumerico {
  return { x1: punto.x1.aNumero(), x2: punto.x2.aNumero() };
}

export interface PuntoEnvolvente {
  x1: number;
  inferior: number;
  superior: number;
}

/**
 * Envolvente inferior/superior de la región factible (plan B, ver cabecera del archivo).
 * Requiere al menos 3 vértices (un polígono real con área); con 1 o 2 vértices la región es
 * un punto o un segmento y se dibuja distinto (ver `index.tsx` / docs/05 §4.1: "Si hay
 * restricciones =, la región es un segmento: dibujarlo grueso"), así que acá se devuelve `[]`.
 *
 * Supone una región ACOTADA (los lados consecutivos, incluida la vuelta del último al
 * primero, son todos lados reales del polígono). Para `regionAcotada: false` no corresponde
 * llamar esta función con el mismo criterio: el lado que "cierra" del último vértice al
 * primero no existe en una región abierta (ver nota en `index.tsx`).
 */
export function calcularEnvolvente(vertices: readonly Vertice[]): PuntoEnvolvente[] {
  if (vertices.length < 3) {
    return [];
  }

  const puntos = vertices.map((v) => puntoANumero(v.punto));
  const n = puntos.length;
  const xs = Array.from(new Set(puntos.map((p) => p.x1))).sort((a, b) => a - b);

  return xs.map((x1) => {
    const candidatos: number[] = [];

    // Todo vértice en este quiebre es, por definición, un punto del borde.
    for (const p of puntos) {
      if (p.x1 === x1) {
        candidatos.push(p.x2);
      }
    }

    // Lados no verticales cuyo interior (abierto) pasa exactamente por este quiebre.
    // Los extremos ya quedaron cubiertos arriba por el punto; un lado vertical (a.x1 === b.x1)
    // no aporta nada más: sus dos extremos son vértices y ya están contemplados.
    for (let i = 0; i < n; i += 1) {
      const a = puntos[i]!;
      const b = puntos[(i + 1) % n]!;
      if (a.x1 === b.x1) {
        continue;
      }
      const minX = Math.min(a.x1, b.x1);
      const maxX = Math.max(a.x1, b.x1);
      if (x1 > minX && x1 < maxX) {
        const t = (x1 - a.x1) / (b.x1 - a.x1);
        candidatos.push(a.x2 + t * (b.x2 - a.x2));
      }
    }

    return {
      x1,
      inferior: Math.min(...candidatos),
      superior: Math.max(...candidatos),
    };
  });
}

/**
 * Segmento de la recta `a1·x1 + a2·x2 = b`, recortado al dominio visible (para las rectas de
 * restricción y la recta de nivel). docs/05 §5 punto 2: una recta vertical (`a2 = 0`) no es
 * función de x1, por eso se calcula con dos puntos de x2 fijo en vez de evaluar `x2(x1)`.
 * `null` si la "recta" es degenerada (`a1 = a2 = 0`: ni vertical ni función de x1).
 */
export function calcularSegmentoLinea(
  a1: number,
  a2: number,
  b: number,
  dominioX1: readonly [number, number],
  dominioX2: readonly [number, number],
): SegmentoNumerico | null {
  if (a1 === 0 && a2 === 0) {
    return null;
  }
  if (a2 === 0) {
    const x1 = b / a1;
    return { desde: { x1, x2: dominioX2[0] }, hasta: { x1, x2: dominioX2[1] } };
  }
  const x2En = (x1: number): number => (b - a1 * x1) / a2;
  return {
    desde: { x1: dominioX1[0], x2: x2En(dominioX1[0]) },
    hasta: { x1: dominioX1[1], x2: x2En(dominioX1[1]) },
  };
}

/**
 * Valor máximo del slider de la recta de nivel (docs/05 §4.1: "un Slider mueve k de 0 al
 * valor óptimo (o al máximo del dominio)"). Con óptimo finito, el máximo es ese Z; si no
 * (`no_acotado`), se usa Z evaluado en la esquina más lejana del dominio visible.
 */
export function calcularNivelMaximo(
  c1: number,
  c2: number,
  optimoZ: number | undefined,
  dominioX1: readonly [number, number],
  dominioX2: readonly [number, number],
): number {
  if (optimoZ !== undefined) {
    return optimoZ;
  }
  return c1 * dominioX1[1] + c2 * dominioX2[1];
}

/** Punto medio de un segmento numérico (para anclar la flecha de mejora en la recta de nivel). */
export function puntoMedio(segmento: SegmentoNumerico): PuntoNumerico {
  return {
    x1: (segmento.desde.x1 + segmento.hasta.x1) / 2,
    x2: (segmento.desde.x2 + segmento.hasta.x2) / 2,
  };
}

/**
 * Flecha corta que indica la dirección en la que mejora Z (docs/05 §4.1: "Flecha con la
 * dirección en que mejora Z"), anclada en `anclaje` y escalada a `longitud` (en unidades del
 * dominio, no píxeles — el propio `<Chart>` la proyecta a píxeles vía las escalas). La
 * dirección que mejora Z es `(c1, c2)` al maximizar y `-(c1, c2)` al minimizar.
 * `null` si el objetivo es degenerado (`c1 = c2 = 0`).
 */
export function calcularFlechaMejora(
  c1: number,
  c2: number,
  sentido: "max" | "min",
  anclaje: PuntoNumerico,
  longitud: number,
): SegmentoNumerico | null {
  const norma = Math.hypot(c1, c2);
  if (norma === 0) {
    return null;
  }
  const signo = sentido === "max" ? 1 : -1;
  const ux = (signo * c1) / norma;
  const uy = (signo * c2) / norma;
  return {
    desde: anclaje,
    hasta: { x1: anclaje.x1 + ux * longitud, x2: anclaje.x2 + uy * longitud },
  };
}
