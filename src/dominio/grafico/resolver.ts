/**
 * Motor del método gráfico (`dominio/grafico/resolver.ts`) — ver docs/05-metodo-grafico.md §1-2.
 *
 * Dominio puro (AGENTS.md regla de oro #1): sin React/Next/UI.
 * Aritmética exacta con `Fraccion` para TODO lo que decide factibilidad/optimalidad
 * (regla de oro #2). La única excepción autorizada es `ResultadoGrafico.dominio`
 * (rango visible de la gráfica) y el ordenamiento angular de vértices (docs/05 §2.7:
 * "aquí se puede usar number, solo para ordenar"), que son pura presentación.
 *
 * Solo aplica a modelos de exactamente 2 variables (docs/05 §0): quien llama a
 * `resolverGrafico` con otra cantidad de variables recibe un error — la UI ya
 * deshabilita la pestaña en ese caso (docs/05 encabezado), así que llegar aquí con
 * otra cantidad es un error de programación, no un caso de usuario a manejar con gracia.
 */

import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import type { ModeloLineal, Relacion } from "../modelo/tipos";
import type { IdRecta, Punto, PuntoEntero, Recta, ResultadoGrafico, Vertice } from "./tipos";

/** Línea interna de trabajo: una restricción o un eje, ya parseada a `Fraccion`. */
interface Linea {
  id: IdRecta;
  a1: Fraccion;
  a2: Fraccion;
  b: Fraccion;
  relacion: Relacion;
}

const MAX_PUNTOS_ENTEROS_DIBUJABLES = 2500;
const AVISO_DEMASIADOS_ENTEROS = "Hay demasiados puntos enteros para mostrarlos";

function evaluar(linea: { a1: Fraccion; a2: Fraccion }, x1: Fraccion, x2: Fraccion): Fraccion {
  return linea.a1.multiplicar(x1).sumar(linea.a2.multiplicar(x2));
}

/** `valor (relacion) b`, con comparación exacta. */
function cumpleRelacion(relacion: Relacion, valor: Fraccion, b: Fraccion): boolean {
  switch (relacion) {
    case "<=":
      return valor.comparar(b) <= 0;
    case ">=":
      return valor.comparar(b) >= 0;
    case "=":
      return valor.igual(b);
  }
}

/** Igual que `cumpleRelacion` pero contra cero (para probar direcciones de recesión: `a·d (relacion) 0`). */
function cumpleRelacionCero(relacion: Relacion, valor: Fraccion): boolean {
  return cumpleRelacion(relacion, valor, Fraccion.CERO);
}

function esFactible(lineas: readonly Linea[], punto: Punto): boolean {
  return lineas.every((l) => cumpleRelacion(l.relacion, evaluar(l, punto.x1, punto.x2), l.b));
}

/** Intersección de dos rectas por la regla de Cramer. `null` si son paralelas (determinante 0). */
function interseccion(l1: Linea, l2: Linea): Punto | null {
  const det = l1.a1.multiplicar(l2.a2).restar(l1.a2.multiplicar(l2.a1));
  if (det.esCero()) {
    return null;
  }
  const x1 = l1.b.multiplicar(l2.a2).restar(l1.a2.multiplicar(l2.b)).dividir(det);
  const x2 = l1.a1.multiplicar(l2.b).restar(l1.b.multiplicar(l2.a1)).dividir(det);
  return { x1, x2 };
}

function clavePunto(p: Punto): string {
  return `${p.x1.num.toString()}/${p.x1.den.toString()}|${p.x2.num.toString()}/${p.x2.den.toString()}`;
}

/** Piso (floor) exacto de una `Fraccion`, sin pasar por `number`. */
function piso(f: Fraccion): bigint {
  const cociente = f.num / f.den;
  if (f.num >= 0n || f.num % f.den === 0n) {
    return cociente;
  }
  return cociente - 1n;
}

/** Máximo de una lista no vacía de `Fraccion` (sin semilla: una semilla en 0 daría mal si todos son negativos). */
function maxFraccion(valores: readonly Fraccion[]): Fraccion {
  return valores.reduce((max, v) => (v.comparar(max) > 0 ? v : max));
}

/** Construye las líneas de trabajo: restricciones no degeneradas + los dos ejes de no negatividad. */
function construirLineas(modelo: ModeloLineal): { lineas: Linea[]; infactiblePorDegenerada: boolean } {
  const lineas: Linea[] = [];
  let infactiblePorDegenerada = false;

  for (const r of modelo.restricciones) {
    const a1 = parsearFraccion(r.coeficientes[0]!);
    const a2 = parsearFraccion(r.coeficientes[1]!);
    const b = parsearFraccion(r.limite);

    if (a1.esCero() && a2.esCero()) {
      // docs/05 §2.1: "no es recta"; si `0 (rel) b` es falso, el modelo es infactible,
      // si es verdadero, se ignora (no se agrega como línea ni como `Recta` de salida).
      if (!cumpleRelacion(r.relacion, Fraccion.CERO, b)) {
        infactiblePorDegenerada = true;
      }
      continue;
    }

    lineas.push({ id: r.numero, a1, a2, b, relacion: r.relacion });
  }

  lineas.push({ id: "eje_x1", a1: Fraccion.de(1), a2: Fraccion.CERO, b: Fraccion.CERO, relacion: ">=" });
  lineas.push({ id: "eje_x2", a1: Fraccion.CERO, a2: Fraccion.de(1), b: Fraccion.CERO, relacion: ">=" });

  return { lineas, infactiblePorDegenerada };
}

function aRecta(l: Linea): Recta {
  const interceptos: { x1?: Fraccion; x2?: Fraccion } = {};
  if (!l.a1.esCero()) {
    interceptos.x1 = l.b.dividir(l.a1);
  }
  if (!l.a2.esCero()) {
    interceptos.x2 = l.b.dividir(l.a2);
  }
  return { restriccion: l.id, a1: l.a1, a2: l.a2, b: l.b, relacion: l.relacion, interceptos };
}

/** Direcciones candidatas para probar acotamiento (docs/05 §2.5): (1,0), (0,1) y (±a2,∓a1) de cada recta. */
function direccionesCandidatas(lineas: readonly Linea[]): Array<{ d1: Fraccion; d2: Fraccion }> {
  const candidatas: Array<{ d1: Fraccion; d2: Fraccion }> = [
    { d1: Fraccion.de(1), d2: Fraccion.CERO },
    { d1: Fraccion.CERO, d2: Fraccion.de(1) },
  ];
  for (const l of lineas) {
    candidatas.push({ d1: l.a2, d2: l.a1.negar() });
    candidatas.push({ d1: l.a2.negar(), d2: l.a1 });
  }
  return candidatas.filter(
    (c) => !(c.d1.esCero() && c.d2.esCero()) && !c.d1.esNegativa() && !c.d2.esNegativa(),
  );
}

/** Direcciones de recesión reales: las candidatas que mantienen la región dentro de TODAS las líneas. */
function direccionesDeRecesion(lineas: readonly Linea[]): Array<{ d1: Fraccion; d2: Fraccion }> {
  return direccionesCandidatas(lineas).filter((d) =>
    lineas.every((l) => cumpleRelacionCero(l.relacion, evaluar(l, d.d1, d.d2))),
  );
}

/** Ordena los vértices en sentido antihorario respecto al centroide, empezando por el más cercano al origen. */
function ordenarVertices(puntos: readonly Punto[]): Punto[] {
  if (puntos.length <= 1) {
    return [...puntos];
  }

  const numericos = puntos.map((p) => ({ x1: p.x1.aNumero(), x2: p.x2.aNumero() }));
  const cx = numericos.reduce((s, p) => s + p.x1, 0) / numericos.length;
  const cy = numericos.reduce((s, p) => s + p.x2, 0) / numericos.length;

  const indices = puntos.map((_, i) => i);
  indices.sort((i, j) => {
    const angI = Math.atan2(numericos[i]!.x2 - cy, numericos[i]!.x1 - cx);
    const angJ = Math.atan2(numericos[j]!.x2 - cy, numericos[j]!.x1 - cx);
    return angI - angJ;
  });

  let indiceCercano = 0;
  let distMin = puntos[0]!.x1.multiplicar(puntos[0]!.x1).sumar(puntos[0]!.x2.multiplicar(puntos[0]!.x2));
  for (let i = 1; i < puntos.length; i += 1) {
    const d = puntos[i]!.x1.multiplicar(puntos[i]!.x1).sumar(puntos[i]!.x2.multiplicar(puntos[i]!.x2));
    if (d.comparar(distMin) < 0) {
      distMin = d;
      indiceCercano = i;
    }
  }

  const posicionEnOrden = indices.indexOf(indiceCercano);
  const rotado = [...indices.slice(posicionEnOrden), ...indices.slice(0, posicionEnOrden)];
  return rotado.map((i) => puntos[i]!);
}

const ETIQUETAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function etiquetaVertice(indice: number): string {
  if (indice < ETIQUETAS.length) {
    return ETIQUETAS[indice]!;
  }
  // Más de 26 vértices es inusual para 2 variables con ≤ 6 restricciones, pero no imposible
  // (varias restricciones degeneradas en el mismo punto); se sigue con A1, A2... en vez de romper.
  return `A${indice - ETIQUETAS.length + 1}`;
}

function dominioEje(valores: readonly number[], acotada: boolean): [number, number] {
  const maxCrudo = valores.reduce((m, v) => Math.max(m, v), 0);
  const base = Math.max(maxCrudo, 1);
  const factor = acotada ? 1.2 : 1.6;
  return [0, base * factor];
}

export function resolverGrafico(modelo: ModeloLineal): ResultadoGrafico {
  if (modelo.variables.length !== 2) {
    throw new Error(
      `resolverGrafico solo acepta modelos de 2 variables (recibió ${modelo.variables.length}). ` +
        "La UI debe deshabilitar esta vista con otra cantidad (docs/05-metodo-grafico.md).",
    );
  }

  const c1 = parsearFraccion(modelo.objetivo.coeficientes[0]!);
  const c2 = parsearFraccion(modelo.objetivo.coeficientes[1]!);
  const esMax = modelo.objetivo.sentido === "max";

  const { lineas, infactiblePorDegenerada } = construirLineas(modelo);
  const rectas = lineas.map(aRecta);

  if (infactiblePorDegenerada) {
    return {
      estado: "infactible",
      rectas,
      vertices: [],
      regionAcotada: false,
      dominio: { x1: dominioEje([], false), x2: dominioEje([], false) },
    };
  }

  // 1-3. Intersecciones por pares (Cramer) + filtro de factibilidad exacta, con deduplicación.
  const vistos = new Set<string>();
  const puntosFactibles: Punto[] = [];
  for (let i = 0; i < lineas.length; i += 1) {
    for (let j = i + 1; j < lineas.length; j += 1) {
      const punto = interseccion(lineas[i]!, lineas[j]!);
      if (punto === null) {
        continue;
      }
      const clave = clavePunto(punto);
      if (vistos.has(clave)) {
        continue;
      }
      vistos.add(clave);
      if (esFactible(lineas, punto)) {
        puntosFactibles.push(punto);
      }
    }
  }

  // 4. Sin puntos factibles -> infactible.
  if (puntosFactibles.length === 0) {
    return {
      estado: "infactible",
      rectas,
      vertices: [],
      regionAcotada: false,
      dominio: { x1: dominioEje([], false), x2: dominioEje([], false) },
    };
  }

  const ordenados = ordenarVertices(puntosFactibles);

  // 5. Acotamiento: existe una dirección de recesión real.
  const recesion = direccionesDeRecesion(lineas);
  const regionAcotada = recesion.length === 0;

  // 6. Óptimo (o no acotado / óptimos alternativos por una dirección de recesión).
  const valorZ = (p: Punto): Fraccion => c1.multiplicar(p.x1).sumar(c2.multiplicar(p.x2));
  const zPorVertice = ordenados.map(valorZ);

  const mejoraDireccion = (d: { d1: Fraccion; d2: Fraccion }): boolean => {
    const cd = c1.multiplicar(d.d1).sumar(c2.multiplicar(d.d2));
    return esMax ? cd.esPositiva() : cd.esNegativa();
  };
  const empataDireccion = (d: { d1: Fraccion; d2: Fraccion }): boolean => {
    const cd = c1.multiplicar(d.d1).sumar(c2.multiplicar(d.d2));
    return cd.esCero();
  };

  if (!regionAcotada && recesion.some(mejoraDireccion)) {
    const vertices: Vertice[] = ordenados.map((punto, i) => ({
      id: etiquetaVertice(i),
      punto,
      z: zPorVertice[i]!,
      restriccionesActivas: lineas
        .filter((l) => evaluar(l, punto.x1, punto.x2).igual(l.b))
        .map((l) => l.id),
      esOptimo: false,
    }));
    return {
      estado: "no_acotado",
      rectas,
      vertices,
      regionAcotada: false,
      dominio: {
        x1: dominioEje([...rectasInterceptosX1(rectas), ...ordenados.map((p) => p.x1.aNumero())], false),
        x2: dominioEje([...rectasInterceptosX2(rectas), ...ordenados.map((p) => p.x2.aNumero())], false),
      },
    };
  }

  const mejorValor = esMax ? maxFraccion(zPorVertice) : zPorVertice.reduce((m, v) => (v.comparar(m) < 0 ? v : m));
  const indicesOptimos = zPorVertice
    .map((z, i) => (z.igual(mejorValor) ? i : -1))
    .filter((i) => i >= 0);

  let segmentoOptimo: [Punto, Punto] | undefined;
  if (indicesOptimos.length >= 2) {
    const n = ordenados.length;
    for (let k = 0; k < n; k += 1) {
      const siguiente = (k + 1) % n;
      if (indicesOptimos.includes(k) && indicesOptimos.includes(siguiente)) {
        segmentoOptimo = [ordenados[k]!, ordenados[siguiente]!];
        break;
      }
    }
  }

  const direccionEmpate = !regionAcotada && recesion.some(empataDireccion);

  let estado: ResultadoGrafico["estado"];
  if (direccionEmpate) {
    estado = "optimos_alternativos";
    segmentoOptimo = undefined; // docs/05 §2.6: "informar estado sin segmento".
  } else if (indicesOptimos.length >= 2 && segmentoOptimo !== undefined) {
    estado = "optimos_alternativos";
  } else {
    estado = "optimo";
  }

  const indiceOptimoRepresentativo = indicesOptimos[0]!;
  const optimo = { punto: ordenados[indiceOptimoRepresentativo]!, z: mejorValor };

  const vertices: Vertice[] = ordenados.map((punto, i) => ({
    id: etiquetaVertice(i),
    punto,
    z: zPorVertice[i]!,
    restriccionesActivas: lineas.filter((l) => evaluar(l, punto.x1, punto.x2).igual(l.b)).map((l) => l.id),
    esOptimo: indicesOptimos.includes(i),
  }));

  const maxX1 = maxFraccion(ordenados.map((p) => p.x1));
  const maxX2 = maxFraccion(ordenados.map((p) => p.x2));
  const dominio = {
    x1: dominioEje(
      [...rectasInterceptosX1(rectas), ...ordenados.map((p) => p.x1.aNumero())],
      regionAcotada,
    ),
    x2: dominioEje(
      [...rectasInterceptosX2(rectas), ...ordenados.map((p) => p.x2.aNumero())],
      regionAcotada,
    ),
  };

  const resultado: ResultadoGrafico = {
    estado,
    rectas,
    vertices,
    regionAcotada,
    optimo,
    segmentoOptimo,
    dominio,
  };

  // 2.1 Puntos enteros: solo si la región es acotada y el modelo es de naturaleza entera.
  if (regionAcotada && modelo.naturaleza === "entera") {
    const limiteX1 = piso(maxX1);
    const limiteX2 = piso(maxX2);
    const candidatos: PuntoEntero[] = [];
    for (let i = 0n; i <= limiteX1; i += 1n) {
      for (let j = 0n; j <= limiteX2; j += 1n) {
        const punto: Punto = { x1: Fraccion.de(i, 1n), x2: Fraccion.de(j, 1n) };
        if (esFactible(lineas, punto)) {
          candidatos.push({ punto, z: valorZ(punto) });
        }
      }
    }

    if (candidatos.length > 0) {
      const mejor = candidatos.reduce((m, c) =>
        (esMax ? c.z.comparar(m.z) > 0 : c.z.comparar(m.z) < 0) ? c : m,
      );
      resultado.mejorEntero = { punto: mejor.punto, z: mejor.z };
    }

    if (candidatos.length > MAX_PUNTOS_ENTEROS_DIBUJABLES) {
      resultado.avisos = [AVISO_DEMASIADOS_ENTEROS];
    } else {
      resultado.puntosEnteros = candidatos;
    }
  }

  return resultado;
}

function rectasInterceptosX1(rectas: readonly Recta[]): number[] {
  return rectas
    .map((r) => r.interceptos.x1)
    .filter((v): v is Fraccion => v !== undefined && v.esPositiva())
    .map((v) => v.aNumero());
}

function rectasInterceptosX2(rectas: readonly Recta[]): number[] {
  return rectas
    .map((r) => r.interceptos.x2)
    .filter((v): v is Fraccion => v !== undefined && v.esPositiva())
    .map((v) => v.aNumero());
}
