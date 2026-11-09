/**
 * Parsers de nuqs v2 compartidos (`lib/url-state.ts`) — ver docs/02-arquitectura.md §3 y
 * §3.1, y docs/03-dominio-y-validacion.md §5.
 *
 * Centralizados acá para que todas las páginas (`/resolver`, `/modelo/asistente`,
 * `/modelo/editor`) usen las mismas claves y el mismo comportamiento de historial.
 * Esta es la ÚNICA capa que depende de `nuqs`: el dominio (`src/dominio/**`) sigue
 * siendo puro (AGENTS.md regla de oro #1).
 *
 * Tabla de estado (docs/02 §3):
 *
 * | Clave     | Parser                                    | `history` |
 * |-----------|--------------------------------------------|-----------|
 * | `?m=`     | `parseAsModelo`                             | `push` al llegar desde el asistente/editor (docs/02 §3.1) |
 * | `?vista=` | `parseAsStringLiteral` (`VISTAS`)           | `replace` |
 * | `?iter=`  | `parseAsInteger`                            | `replace` |
 * | `?num=`   | `parseAsStringLiteral` (`FORMATOS_NUMERO`), default `'fraccion'` | `replace` |
 * | `?paso=`  | `parseAsInteger`                            | `replace` (stepper del asistente, docs/06 §… "no se puede saltar") |
 *
 * `history: 'push'` para `?m=` NO se fija acá con `.withOptions`: según docs/02 §3.1 ese
 * `push` ocurre específicamente "al llegar desde el asistente/editor" (la navegación
 * `router.push('/resolver?m=…')` de docs/02 §3.3), no en cada actualización futura de la
 * query dentro de `/resolver`. Si más adelante `/resolver` necesita modificar `?m=` en el
 * lugar (ej. al editar algo sin volver al editor), ese caso puntual deberá decidir su
 * propio `history` en el `setState`, no en el parser compartido.
 */

import { createParser, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { deserializarModelo, serializarModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

/** Claves de query string, centralizadas para que ninguna página las escriba a mano. */
export const CLAVE_MODELO = "m";
export const CLAVE_VISTA = "vista";
export const CLAVE_ITER = "iter";
export const CLAVE_NUM = "num";
export const CLAVE_PASO = "paso";

/** Vistas de `/resolver` — docs/06-ux-ui.md: `/resolver?m=…&vista=modelo|grafico|simplex|interpretacion`. */
export const VISTAS = ["modelo", "grafico", "simplex", "interpretacion"] as const;
export type Vista = (typeof VISTAS)[number];
export const VISTA_DEFECTO: Vista = "modelo";

/** Formato numérico de presentación — docs/02 §3: `fraccion`/`decimal`, default `fraccion`. */
export const FORMATOS_NUMERO = ["fraccion", "decimal"] as const;
export type FormatoNumero = (typeof FORMATOS_NUMERO)[number];
export const FORMATO_NUMERO_DEFECTO: FormatoNumero = "fraccion";

/**
 * Parser nuqs del modelo resuelto (`?m=`). Envuelve `serializarModelo`/`deserializarModelo`
 * del dominio: `parse` nunca lanza (devuelve `null` si `deserializarModelo` falla, tal como
 * pide la firma de `SingleParser.parse` de nuqs), y `eq` compara por el string serializado
 * (evita releer el objeto completo en cada comparación) — snippet exacto de docs/03 §5.
 *
 * El `history: 'push'` que docs/02 §3.1 pide "al llegar desde el asistente/editor" NO se
 * fija acá con `.withOptions`: ese `push` es la navegación puntual
 * `router.push('/resolver?m=…')` (docs/02 §3.3), no una actualización de estado a través de
 * este parser. Dentro de `/resolver`, cualquier lectura/escritura de `?m=` usa el
 * comportamiento por defecto de nuqs (`replace`), salvo que un flujo futuro puntual necesite
 * lo contrario — esa decisión queda para ese `setState`, no para el parser compartido.
 */
export const parseAsModelo = createParser<ModeloLineal>({
  parse: (valor) => {
    const resultado = deserializarModelo(valor);
    return resultado.ok ? resultado.valor : null;
  },
  serialize: serializarModelo,
  eq: (a, b) => serializarModelo(a) === serializarModelo(b),
});

/** `?vista=` — docs/02 §3.1: `history: 'replace'`. */
export const parseAsVista = parseAsStringLiteral(VISTAS).withOptions({ history: "replace" });

/** `?num=` — docs/02 §3.1: `history: 'replace'`, default `'fraccion'` (docs/02 §3). */
export const parseAsFormatoNumero = parseAsStringLiteral(FORMATOS_NUMERO).withOptions({
  history: "replace",
});

/** `?iter=` — docs/02 §3.1: `history: 'replace'`. */
export const parseAsIter = parseAsInteger.withOptions({ history: "replace" });

/**
 * `?paso=` — paso del asistente (1..5). docs/02 §3.1 no menciona `paso` explícitamente en
 * la tabla de `history` (solo `m`, `vista`, `iter`, `num`), pero `'push'` ahí está reservado
 * para `?m=` al llegar desde el asistente/editor (ver nota de `parseAsModelo`); por
 * simetría con `vista`/`iter`/`num` y porque `replace` es el default de nuqs, se fija
 * explícitamente `replace` también para `paso` — decisión de bajísimo riesgo y reversible.
 */
export const parseAsPaso = parseAsInteger.withOptions({ history: "replace" });
