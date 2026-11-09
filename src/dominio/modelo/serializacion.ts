/**
 * Serialización del modelo en la URL (`dominio/modelo/serializacion.ts`).
 *
 * "La URL es la fuente de verdad del modelo resuelto" (AGENTS.md regla de oro #4):
 * `serializarModelo` convierte un `ModeloLineal` ya validado en el string que viaja
 * en `?m=`, y `deserializarModelo` hace el camino inverso, siempre a través de
 * `esquemaModelo` (regla de oro #3: Zod es la única fuente de validación) y sin
 * lanzar nunca una excepción para una entrada corrupta — ver docs/03-dominio-y-validacion.md §5.
 *
 * Dominio puro (regla de oro #1): nada de React/Next/UI. Tampoco se usa `Buffer`:
 * es una API de Node, no existe en el navegador. La codificación UTF-8 → base64url
 * se hace a mano con `TextEncoder`/`TextDecoder` y `btoa`/`atob`, que sí son
 * universales (navegador y Node modernos).
 *
 * ---------------------------------------------------------------------------
 * MAPA DE CLAVES (JSON compacto, orden de claves FIJO — ver §"Formato" abajo)
 * ---------------------------------------------------------------------------
 *
 * docs/03 §5 da un ejemplo parcial e ilustrativo (`{ v:1, o:'e', s:'max', c:['3','2'],
 * r:[{n:'Horas', c:['2','5'], r:'<=', b:'35'}], … }`) pero termina en "…": no cubre
 * `titulo`, `contexto`, `meta`, `variables` ni `naturaleza`. Para las claves que el
 * ejemplo SÍ muestra se usan exactamente esas letras (`v`, `s`, `c` del objetivo, `r`
 * para restricciones y, dentro de cada una, `n`/`c`/`r`/`b`). Para el resto se eligió
 * una clave corta y se documenta aquí — decisión de bajísimo riesgo y reversible
 * (formato interno, opaco para quien lee la URL), reportada como tal en el resumen
 * de la tarea en lugar de inventarla en silencio.
 *
 * Nivel superior, EN ESTE ORDEN:
 *
 * | Clave | Campo de `ModeloLineal`        | Notas |
 * |-------|---------------------------------|-------|
 * | `v`   | `version`                       | siempre `1` |
 * | `o`   | `origen`                         | string completo (`"asistente"`/`"editor"`/`"ejemplo"`) |
 * | `t`   | `titulo`                         | opcional; omitida si no hay título |
 * | `x`   | `contexto`                       | opcional (solo si `origen === 'asistente'`); `{ c: categoria, u: unidad }` |
 * | `va`  | `variables`                      | array de `{ e: etiqueta, d: definicion }` — `nombre` NO se serializa: es generado (`"x" + (índice+1)`), nunca escrito por el usuario (ver tipos.ts) |
 * | `s`   | `objetivo.sentido`                | `"max"` / `"min"` |
 * | `me`  | `objetivo.meta`                  | opcional (solo si `origen === 'asistente'`) |
 * | `c`   | `objetivo.coeficientes`          | `string[]` |
 * | `r`   | `restricciones`                  | array de `{ n: nombre, c: coeficientes, r: relacion, b: limite }` — `numero` NO se serializa: se recalcula como índice+1 al deserializar (docs/03 §3.3: "se recalcula al guardar, no se valida") |
 * | `na`  | `naturaleza`                      | `"entera"` / `"fraccionaria"` |
 *
 * `objetivo.simbolo` tampoco se serializa: siempre es `"Z"` (tipos.ts), se reconstruye
 * como literal.
 *
 * El orden de claves arriba es el que se usa SIEMPRE al construir el objeto (las
 * opcionales ausentes simplemente no aparecen). Como ninguna clave es un índice
 * numérico, `JSON.stringify` preserva el orden de inserción: el mismo modelo produce
 * siempre el mismo string (requisito de docs/03 §5, usado como hash de deduplicación
 * — ver `hashModelo` más abajo).
 *
 * ---------------------------------------------------------------------------
 * Formato: JSON compacto → UTF-8 → base64url. Sin compresión (ver docs/03 §5: los
 * modelos de hasta 6×6 entran en < 2 KB). Límite duro: 6000 caracteres.
 */

import { esquemaModelo } from "./esquemas";
import type {
  CategoriaId,
  MetaId,
  ModeloLineal,
  Naturaleza,
  NumeroTexto,
  Origen,
  Relacion,
  Sentido,
} from "./tipos";

/** Límite de longitud del string serializado (docs/03 §5): por encima de esto, se rechaza. */
export const LIMITE_LONGITUD_SERIALIZADO = 6000;

/**
 * Resultado de un parseo que puede fallar sin lanzar excepción (docs/03 §5): `ok: true`
 * con el valor ya validado, o `ok: false` con un mensaje de error en español.
 */
export type ResultadoParseo<T> = { ok: true; valor: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// 1. Forma serializada (claves cortas) — ver mapa de claves arriba
// ---------------------------------------------------------------------------

interface ContextoSerializado {
  c: CategoriaId;
  u: string;
}

interface VariableSerializada {
  e: string;
  d: string;
}

interface RestriccionSerializada {
  n: string;
  c: NumeroTexto[];
  r: Relacion;
  b: NumeroTexto;
}

interface ModeloSerializado {
  v: 1;
  o: Origen;
  t?: string;
  x?: ContextoSerializado;
  va: VariableSerializada[];
  s: Sentido;
  me?: MetaId;
  c: NumeroTexto[];
  r: RestriccionSerializada[];
  na: Naturaleza;
}

// ---------------------------------------------------------------------------
// 2. Codificación UTF-8 → base64url (sin `Buffer`: no existe en el navegador)
// ---------------------------------------------------------------------------

/** Texto → base64url (sin `=` de relleno, `+`→`-`, `/`→`_`). */
function textoABase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = "";
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  const base64 = btoa(binario);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url → texto. Lanza si el string no es base64 válido (lo captura el llamador). */
function base64UrlATexto(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const relleno = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binario = atob(base64 + relleno);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

// ---------------------------------------------------------------------------
// 3. ModeloLineal ⇄ ModeloSerializado
// ---------------------------------------------------------------------------

/**
 * Construye el objeto serializado con las claves en el orden fijo documentado en
 * el mapa de claves (clave presente solo si el campo opcional correspondiente
 * existe en `modelo`): como ninguna clave es un índice numérico, `JSON.stringify`
 * preserva este orden de inserción siempre, por eso el mismo modelo produce
 * siempre el mismo string.
 */
function aSerializado(modelo: ModeloLineal): ModeloSerializado {
  const variables: VariableSerializada[] = modelo.variables.map((variable) => ({
    e: variable.etiqueta,
    d: variable.definicion,
  }));
  const restricciones: RestriccionSerializada[] = modelo.restricciones.map((restriccion) => ({
    n: restriccion.nombre,
    c: restriccion.coeficientes,
    r: restriccion.relacion,
    b: restriccion.limite,
  }));

  return {
    v: 1,
    o: modelo.origen,
    ...(modelo.titulo !== undefined ? { t: modelo.titulo } : {}),
    ...(modelo.contexto !== undefined
      ? { x: { c: modelo.contexto.categoria, u: modelo.contexto.unidad } }
      : {}),
    va: variables,
    s: modelo.objetivo.sentido,
    ...(modelo.objetivo.meta !== undefined ? { me: modelo.objetivo.meta } : {}),
    c: modelo.objetivo.coeficientes,
    r: restricciones,
    na: modelo.naturaleza,
  };
}

/**
 * Reconstruye el objeto que espera `esquemaModelo` a partir de la forma serializada
 * (JSON ya parseado, de tipo `unknown`: puede venir corrupto). No lanza: cualquier
 * forma inesperada hace que la reconstrucción produzca un objeto que luego falla la
 * validación de Zod (o, en el peor caso, el `try/catch` de `deserializarModelo`
 * atrapa el error de acceso a una propiedad de algo que no es un objeto).
 */
/** Objeto plano si `valor` es un objeto no nulo; objeto vacío en cualquier otro caso. */
function comoRegistro(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null ? (valor as Record<string, unknown>) : {};
}

function reconstruirDesdeJson(json: unknown): unknown {
  const datos = comoRegistro(json);

  const variables = Array.isArray(datos.va)
    ? datos.va.map((variable: unknown, indice: number) => {
        const v = comoRegistro(variable);
        return { nombre: `x${indice + 1}`, etiqueta: v.e, definicion: v.d };
      })
    : [];

  const restricciones = Array.isArray(datos.r)
    ? datos.r.map((restriccion: unknown, indice: number) => {
        const x = comoRegistro(restriccion);
        return { numero: indice + 1, nombre: x.n, coeficientes: x.c, relacion: x.r, limite: x.b };
      })
    : [];

  const contexto =
    datos.x !== undefined
      ? { categoria: comoRegistro(datos.x).c, unidad: comoRegistro(datos.x).u }
      : undefined;

  return {
    version: datos.v,
    titulo: datos.t,
    origen: datos.o,
    contexto,
    variables,
    objetivo: {
      sentido: datos.s,
      meta: datos.me,
      coeficientes: datos.c,
      simbolo: "Z" as const,
    },
    restricciones,
    naturaleza: datos.na,
  };
}

// ---------------------------------------------------------------------------
// 4. API pública
// ---------------------------------------------------------------------------

/**
 * `ModeloLineal` → string de la URL (JSON compacto → UTF-8 → base64url).
 *
 * Se asume que `modelo` ya es válido (viene de `esquemaModelo.parse`/`safeParse`,
 * nunca se construye a mano desde fuera del dominio). Si el resultado superase el
 * límite de longitud (no debería ocurrir con un modelo de hasta 6×6 — docs/03 §5),
 * se lanza: a diferencia de `deserializarModelo`, esta función no recibe datos no
 * confiables del exterior, así que no necesita devolver un `ResultadoParseo`.
 */
export function serializarModelo(modelo: ModeloLineal): string {
  const json = JSON.stringify(aSerializado(modelo));
  const resultado = textoABase64Url(json);
  if (resultado.length > LIMITE_LONGITUD_SERIALIZADO) {
    throw new Error(
      `El modelo serializado supera el límite de ${LIMITE_LONGITUD_SERIALIZADO} caracteres.`,
    );
  }
  return resultado;
}

/**
 * String de la URL → `ModeloLineal`. Nunca lanza: una entrada vacía, no-base64url,
 * JSON inválido o que no valida contra `esquemaModelo` devuelve `{ ok: false, error }`.
 */
export function deserializarModelo(valor: string): ResultadoParseo<ModeloLineal> {
  if (valor.length === 0 || valor.length > LIMITE_LONGITUD_SERIALIZADO) {
    return { ok: false, error: "El enlace no es válido: longitud fuera de rango." };
  }

  let json: unknown;
  try {
    const texto = base64UrlATexto(valor);
    json = JSON.parse(texto);
  } catch {
    return { ok: false, error: "El enlace no es válido o está dañado." };
  }

  let candidato: unknown;
  try {
    candidato = reconstruirDesdeJson(json);
  } catch {
    return { ok: false, error: "El enlace no es válido o está dañado." };
  }

  const resultado = esquemaModelo.safeParse(candidato);
  if (!resultado.success) {
    const mensaje = resultado.error.issues[0]?.message ?? "El modelo del enlace no es válido.";
    return { ok: false, error: mensaje };
  }
  return { ok: true, valor: resultado.data };
}

// ---------------------------------------------------------------------------
// 5. Hash de deduplicación (historial) — EXCLUYE el título
// ---------------------------------------------------------------------------
//
// Decisión confirmada con el usuario (no se cuestiona): el título NO participa del
// hash usado para deduplicar en el historial — dos modelos iguales con títulos
// distintos deben dar el mismo hash. Esto es un matiz respecto de docs/02 §3.2
// ("hashModelo = el mismo string serializado de ?m="): ese string SÍ incluye el
// título (clave `t`), así que `hashModelo` no puede ser literalmente igual a
// `serializarModelo`. Se implementa como una función aparte que serializa el mismo
// JSON compacto pero sin la clave `t`, y le aplica un hash corto (FNV-1a 32 bits,
// en base36) para que sirva como clave de caché/deduplicación corta y estable.
// FNV-1a es una elección interna de bajísimo riesgo y reversible (no hace falta que
// sea criptográfico: solo deduplicar por igualdad exacta del modelo).

/** FNV-1a de 32 bits sobre un string, devuelto en base36 (corto, estable, sin signo). */
function fnv1a32(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Hash corto y estable del modelo, EXCLUYENDO el título (ver nota arriba). Se usa
 * para deduplicar en el historial y como clave de `TanStack Query`
 * (`['solucion', 'simplex', hashModelo]`, docs/02 §3.2).
 */
export function hashModelo(modelo: ModeloLineal): string {
  // Reutiliza aSerializado: al pasar `titulo: undefined` la clave `t` queda afuera del
  // objeto (misma lógica condicional que usa `serializarModelo`), sin duplicar código.
  const serializado = aSerializado({ ...modelo, titulo: undefined });
  return fnv1a32(JSON.stringify(serializado));
}
