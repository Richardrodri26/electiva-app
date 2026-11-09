/**
 * Esquemas Zod del modelo (`dominio/modelo/esquemas.ts`).
 *
 * Zod es la única fuente de validación (AGENTS.md regla de oro #3): el asistente, el
 * editor técnico y el parser de la URL (`serializacion.ts`) usan estos mismos esquemas.
 * Dominio puro (regla de oro #1): nada de React/Next/UI.
 *
 * `numeroAsistente` replica, en el mismo orden y con los mismos textos literales, a
 * `analizarNumero` de `console-program/src/validation.ts` y los mensajes de
 * `console-program/src/io/prompt.ts` — ver docs/03-dominio-y-validacion.md §3.1.
 *
 * Nunca se usa `Number()`/`parseFloat` para decidir si un valor es "demasiado grande":
 * la comparación con el tope (1e12) se hace con `Fraccion` (regla de oro #2).
 */

import { z } from "zod";
import { Fraccion } from "../aritmetica/fraccion";
import { parsearFraccion } from "../aritmetica/parseo";
import type { CategoriaId, MetaId, Naturaleza, NumeroTexto, Relacion, Sentido } from "./tipos";

/** `Sentido` como esquema reutilizable (editor y modelo final). */
const esquemaSentido: z.ZodType<Sentido> = z.enum(["max", "min"] as const);

/** `Relacion` como esquema reutilizable (editor y modelo final). */
const esquemaRelacion: z.ZodType<Relacion> = z.enum(["<=", ">=", "="] as const);

/** `Naturaleza` como esquema reutilizable (asistente, editor y modelo final). */
const esquemaNaturaleza: z.ZodType<Naturaleza> = z.enum(["entera", "fraccionaria"] as const);

/**
 * Mensajes en español para todo lo que Zod no sobrescribe explícitamente (ver docs/03 §3,
 * "Configurar mensajes en español"). Nombre de función confirmado contra el código fuente
 * instalado (`node_modules/zod/src/v4/classic/tests/default-locale.test.ts`): en Zod 4.6 es
 * `z.config(z.locales.es())`, no hay otro nombre vigente.
 */
z.config(z.locales.es());

// ---------------------------------------------------------------------------
// 1. Tope de magnitud (compartido por numeroAsistente y numeroEditor)
// ---------------------------------------------------------------------------

/** Mismo tope que `VALOR_MAXIMO` de `console-program/src/validation.ts` (1e12), como Fraccion exacta. */
const LIMITE_MAGNITUD = Fraccion.de(1_000_000_000_000);

function superaElLimite(valor: Fraccion): boolean {
  return valor.abs().comparar(LIMITE_MAGNITUD) === 1;
}

// ---------------------------------------------------------------------------
// 2. numeroAsistente — console-program/src/validation.ts `analizarNumero`
// ---------------------------------------------------------------------------

/**
 * Igual a `PATRON_NUMERO_VALIDO` de `console-program/src/validation.ts`: dígitos, con a lo
 * sumo un separador decimal (punto o coma) seguido de 1 o 2 dígitos. Deliberadamente sin
 * separador de miles.
 */
const PATRON_NUMERO_ASISTENTE = /^\d+([.,]\d{1,2})?$/;

/** Igual a `PATRON_NUMERO_NEGATIVO`: mismo patrón, con un `-` al frente. */
const PATRON_NUMERO_ASISTENTE_NEGATIVO = /^-\d+([.,]\d{1,2})?$/;

export const MSG_NUMERO_FORMATO_INVALIDO = "Por favor ingrese un número válido.";
export const MSG_NUMERO_NEGATIVO = "Por favor ingrese un valor mayor o igual a cero.";
export const MSG_NUMERO_SEPARADOR_MILES =
  "No use puntos ni comas para separar miles. Escriba el número así: 10000 o, si necesita decimales, 10000.5.";
export const MSG_NUMERO_DEMASIADO_GRANDE = "Ese número es demasiado grande, ingrese un valor más razonable.";

/**
 * Quita ceros sobrantes al final de la parte decimal de un texto `entero[.,]decimales` que
 * ya matcheó un patrón numérico válido (como mucho un separador). No cambia la FORMA del
 * número (sigue siendo decimal, nunca se convierte a fracción): decisión confirmada en la
 * tarea T1.2, ej. `"0.50"` → `"0.5"`, pero `"0.5"` y `"1/2"` siguen siendo representaciones
 * distintas.
 */
function normalizarTextoDecimal(texto: string): NumeroTexto {
  const conPunto = texto.replace(",", ".");
  const indiceSeparador = conPunto.indexOf(".");
  if (indiceSeparador === -1) {
    return conPunto;
  }
  const parteEntera = conPunto.slice(0, indiceSeparador);
  const parteDecimal = conPunto.slice(indiceSeparador + 1).replace(/0+$/, "");
  return parteDecimal === "" ? parteEntera : `${parteEntera}.${parteDecimal}`;
}

/**
 * Número en lenguaje del asistente. Mismo orden de motivos y mismos mensajes literales que
 * `analizarNumero` + `preguntarNumero` del CLI (docs/03 §3.1):
 * 1. vacío · 2. negativo · 3. separador de miles · 4. formato inválido · 5. demasiado grande.
 */
export const numeroAsistente = z.string().transform((entrada, ctx): NumeroTexto => {
  const texto = entrada.trim();

  if (texto === "") {
    ctx.addIssue(MSG_NUMERO_FORMATO_INVALIDO);
    return z.NEVER;
  }

  if (PATRON_NUMERO_ASISTENTE_NEGATIVO.test(texto)) {
    ctx.addIssue(MSG_NUMERO_NEGATIVO);
    return z.NEVER;
  }

  if (!PATRON_NUMERO_ASISTENTE.test(texto)) {
    const tieneSeparador = texto.includes(".") || texto.includes(",");
    ctx.addIssue(tieneSeparador ? MSG_NUMERO_SEPARADOR_MILES : MSG_NUMERO_FORMATO_INVALIDO);
    return z.NEVER;
  }

  const valor = parsearFraccion(texto.replace(",", "."));
  if (superaElLimite(valor)) {
    ctx.addIssue(MSG_NUMERO_DEMASIADO_GRANDE);
    return z.NEVER;
  }

  return normalizarTextoDecimal(texto);
});

// ---------------------------------------------------------------------------
// 3. numeroEditor — docs/03 §3.1
// ---------------------------------------------------------------------------

const PATRON_DECIMAL_EDITOR = /^-?\d+([.,]\d{1,6})?$/;
const PATRON_FRACCION_EDITOR = /^(-?)(\d+)\/([1-9]\d*)$/;

export const MSG_NUMERO_EDITOR_INVALIDO = "Escriba un número (ej: 3, -2, 2,5 o 1/3).";

/** Máximo común divisor (no negativo) de dos bigint — mismo algoritmo que `fraccion.ts`. */
function mcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const resto = x % y;
    x = y;
    y = resto;
  }
  return x;
}

/**
 * Reduce una fracción de texto `(-)a/b` sin cambiar su FORMA (sigue siendo `a/b`, nunca se
 * convierte a decimal aunque el resultado sea entero): ej. `"2/4"` → `"1/2"`.
 */
function normalizarTextoFraccion(signo: string, numeradorTexto: string, denominadorTexto: string): NumeroTexto {
  const numerador = BigInt(numeradorTexto);
  const denominador = BigInt(denominadorTexto);
  const divisor = mcd(numerador, denominador);
  const numeradorReducido = numerador / divisor;
  const denominadorReducido = denominador / divisor;
  return `${signo}${numeradorReducido.toString()}/${denominadorReducido.toString()}`;
}

/**
 * Número en el editor técnico: acepta decimal (hasta 6 decimales, punto o coma) o fracción
 * simple `a/b` (denominador positivo, sin ceros a la izquierda), con `|valor| ≤ 1e12`.
 * docs/03 §3.1 no da un mensaje separado para "demasiado grande" en el editor (a diferencia
 * del asistente, que tiene 5 motivos distintos): se reutiliza el único mensaje documentado.
 */
export const numeroEditor = z.string().transform((entrada, ctx): NumeroTexto => {
  const texto = entrada.trim();

  const comoFraccion = PATRON_FRACCION_EDITOR.exec(texto);
  if (comoFraccion !== null) {
    const [, signo, numeradorTexto, denominadorTexto] = comoFraccion;
    const valor = Fraccion.de(
      signo === "-" ? -BigInt(numeradorTexto!) : BigInt(numeradorTexto!),
      BigInt(denominadorTexto!),
    );
    if (superaElLimite(valor)) {
      ctx.addIssue(MSG_NUMERO_EDITOR_INVALIDO);
      return z.NEVER;
    }
    return normalizarTextoFraccion(signo!, numeradorTexto!, denominadorTexto!);
  }

  if (PATRON_DECIMAL_EDITOR.test(texto)) {
    const valor = parsearFraccion(texto.replace(",", "."));
    if (superaElLimite(valor)) {
      ctx.addIssue(MSG_NUMERO_EDITOR_INVALIDO);
      return z.NEVER;
    }
    return normalizarTextoDecimal(texto);
  }

  ctx.addIssue(MSG_NUMERO_EDITOR_INVALIDO);
  return z.NEVER;
});

// ---------------------------------------------------------------------------
// 4. Texto
// ---------------------------------------------------------------------------

export const MSG_NOMBRE_VACIO = "Por favor ingrese un nombre (no puede quedar vacío).";

/** docs/03 §3.2: `trim().min(1, "...").max(40)`. */
export const nombreNoVacio = z.string().trim().min(1, MSG_NOMBRE_VACIO).max(40);

export const MSG_ETIQUETA_DUPLICADA = "Ya existe una opción con ese nombre.";

/**
 * Agrega un issue con mensaje y ruta propios dentro de un `superRefine` (el código siempre
 * es `"custom"`: estas son reglas cruzadas del dominio, no checks nativos de Zod).
 */
function agregarIssue(ctx: z.RefinementCtx, mensaje: string, ruta: (string | number)[]): void {
  ctx.addIssue({ code: "custom", message: mensaje, path: ruta });
}

/** Agrega un issue en `ctx` por cada etiqueta duplicada (sin distinguir mayúsculas/minúsculas). */
function verificarEtiquetasUnicas(
  etiquetas: readonly string[],
  ctx: z.RefinementCtx,
  ruta: (prefijo: number) => (string | number)[],
): void {
  const vistas = new Set<string>();
  etiquetas.forEach((etiqueta, indice) => {
    const clave = etiqueta.trim().toLowerCase();
    if (vistas.has(clave)) {
      agregarIssue(ctx, MSG_ETIQUETA_DUPLICADA, ruta(indice));
    } else {
      vistas.add(clave);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Rangos del modelo (docs/03 §3.3)
// ---------------------------------------------------------------------------

/**
 * Decisión confirmada en la tarea T1.2: el asistente web amplía el rango de variables y
 * restricciones respecto del CLI (que ofrecía 2-3 opciones y 2-4 limitaciones como menú
 * cerrado). Variables: 2 a 6 (igual en asistente y editor). Restricciones: 1 a 6, TAMBIÉN
 * en el asistente — ver nota de ambigüedad en el resumen de la tarea: docs/03 §3.3 sugiere
 * un piso de 2 restricciones "para el asistente", lo cual contradice esta decisión ya
 * confirmada con el usuario; se prioriza la decisión confirmada.
 */
export const LIMITE_VARIABLES = { minimo: 2, maximo: 6 } as const;
export const LIMITE_RESTRICCIONES = { minimo: 1, maximo: 6 } as const;

export const MSG_RANGO_VARIABLES = "Debe haber entre 2 y 6 variables.";
export const MSG_RANGO_RESTRICCIONES = "Debe haber entre 1 y 6 restricciones.";
export const MSG_ERROR_INTERNO_CANTIDAD_APORTES =
  "Error interno: la cantidad de aportes no coincide con la cantidad de variables.";

/** Mensaje técnico (editor / esquemaModelo) — texto literal de docs/03 §3.3. */
export function mensajeRestriccionSinVariables(numero: number): string {
  return `La restricción ${numero} no involucra ninguna variable.`;
}

/** Mensaje sin jerga para el asistente — decisión confirmada en la tarea T1.2 (ver AGENTS.md #5). */
export function mensajeLimitacionSinOpciones(numero: number): string {
  return `La limitación ${numero} no usa ninguna de las opciones.`;
}

export const MSG_OBJETIVO_TODO_CERO =
  "Todas las opciones aportan 0: cualquier punto factible es óptimo.";

/** `true` si el texto representa el número 0 (en cualquier forma: decimal o fracción). */
function esTextoCero(texto: string): boolean {
  try {
    return parsearFraccion(texto).esCero();
  } catch {
    // Si el texto no es parseable, ya lo habrá rechazado el esquema de número
    // correspondiente antes de llegar a este chequeo cruzado.
    return false;
  }
}

function todosLosAportesSonCero(coeficientes: readonly string[]): boolean {
  return coeficientes.length > 0 && coeficientes.every(esTextoCero);
}

// ---------------------------------------------------------------------------
// 6. Asistente paso a paso
// ---------------------------------------------------------------------------

const idCategoria: z.ZodType<CategoriaId> = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
const idMeta: z.ZodType<MetaId> = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const idFormaCumplimiento = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/**
 * Paso 1 — console-program/src/flow/definirVariables.ts: categoría, unidad (ya resuelta si
 * la opción elegida era "Otra") y el nombre de cada opción (2 a 6).
 */
export const esquemaPasoVariables = z
  .object({
    categoria: idCategoria,
    unidad: nombreNoVacio,
    nombresOpciones: z
      .array(nombreNoVacio)
      .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
      .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
  })
  .superRefine((valor, ctx) => {
    verificarEtiquetasUnicas(valor.nombresOpciones, ctx, (indice) => ["nombresOpciones", indice]);
  });

/**
 * Paso 2 — console-program/src/flow/definirObjetivo.ts: meta (determina `sentido` vía
 * `sentidoDesdeMeta`) y un aporte por variable.
 */
export const esquemaPasoObjetivo = z.object({
  meta: idMeta,
  coeficientes: z
    .array(numeroAsistente)
    .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
    .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
});

const MSG_TIPO_RESTRICCION_PERSONALIZADO = "Escriba el nombre de esta limitación.";

/** Una limitación del paso 3 — console-program/src/flow/definirRestricciones.ts. */
const esquemaRestriccionAsistente = z
  .object({
    tipo: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
      z.literal(7),
      z.literal(8),
    ]),
    /** Solo se usa (y se exige) cuando `tipo === 8` ("Otra"). */
    nombrePersonalizado: nombreNoVacio.optional(),
    coeficientes: z
      .array(numeroAsistente)
      .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
      .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
    limite: numeroAsistente,
    formaCumplimiento: idFormaCumplimiento,
  })
  .superRefine((valor, ctx) => {
    if (valor.tipo === 8 && valor.nombrePersonalizado === undefined) {
      agregarIssue(ctx, MSG_TIPO_RESTRICCION_PERSONALIZADO, ["nombrePersonalizado"]);
    }
  });

/**
 * Paso 3 — 1 a 6 limitaciones (decisión confirmada; ver nota de `LIMITE_RESTRICCIONES`).
 * Bloquea una limitación sin ninguna opción, con el mensaje sin jerga técnica (decisión
 * confirmada en la tarea T1.2, AGENTS.md regla de oro #5).
 */
export const esquemaPasoRestricciones = z
  .object({
    restricciones: z
      .array(esquemaRestriccionAsistente)
      .min(LIMITE_RESTRICCIONES.minimo, MSG_RANGO_RESTRICCIONES)
      .max(LIMITE_RESTRICCIONES.maximo, MSG_RANGO_RESTRICCIONES),
  })
  .superRefine((valor, ctx) => {
    valor.restricciones.forEach((restriccion, indice) => {
      if (todosLosAportesSonCero(restriccion.coeficientes)) {
        agregarIssue(ctx, mensajeLimitacionSinOpciones(indice + 1), [
          "restricciones",
          indice,
          "coeficientes",
        ]);
      }
    });
  });

/** Paso 4 — console-program/src/flow/definirNaturaleza.ts. */
export const esquemaPasoNaturaleza = z.object({
  naturaleza: esquemaNaturaleza,
});

// ---------------------------------------------------------------------------
// 7. Editor técnico directo
// ---------------------------------------------------------------------------

const esquemaVariableEditor = z.object({
  etiqueta: nombreNoVacio,
  definicion: nombreNoVacio.max(200),
});

const esquemaRestriccionEditor = z.object({
  nombre: nombreNoVacio,
  coeficientes: z
    .array(numeroEditor)
    .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
    .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
  relacion: esquemaRelacion,
  limite: numeroEditor,
});

/**
 * Editor técnico directo: mismo rango de variables/restricciones que el asistente, pero sin
 * catálogos ni lenguaje cotidiano (AGENTS.md: "editor técnico directo"). Bloquea etiquetas
 * duplicadas y restricciones con todos los aportes en cero, con el mensaje técnico (decisión
 * confirmada: ambos esquemas bloquean, pero con mensajes distintos).
 */
export const esquemaEditor = z
  .object({
    variables: z
      .array(esquemaVariableEditor)
      .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
      .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
    sentido: esquemaSentido,
    coeficientesObjetivo: z
      .array(numeroEditor)
      .min(LIMITE_VARIABLES.minimo, MSG_RANGO_VARIABLES)
      .max(LIMITE_VARIABLES.maximo, MSG_RANGO_VARIABLES),
    restricciones: z
      .array(esquemaRestriccionEditor)
      .min(LIMITE_RESTRICCIONES.minimo, MSG_RANGO_RESTRICCIONES)
      .max(LIMITE_RESTRICCIONES.maximo, MSG_RANGO_RESTRICCIONES),
    naturaleza: esquemaNaturaleza,
  })
  .superRefine((valor, ctx) => {
    verificarEtiquetasUnicas(
      valor.variables.map((variable) => variable.etiqueta),
      ctx,
      (indice) => ["variables", indice, "etiqueta"],
    );
    valor.restricciones.forEach((restriccion, indice) => {
      if (todosLosAportesSonCero(restriccion.coeficientes)) {
        agregarIssue(ctx, mensajeRestriccionSinVariables(indice + 1), [
          "restricciones",
          indice,
          "coeficientes",
        ]);
      }
    });
  });

// ---------------------------------------------------------------------------
// 8. Modelo final completo (docs/03 §3.3)
// ---------------------------------------------------------------------------

const esquemaVariableModelo = z.object({
  nombre: z.string().min(1),
  etiqueta: nombreNoVacio,
  definicion: z.string().min(1),
});

const esquemaObjetivoModelo = z.object({
  sentido: esquemaSentido,
  meta: idMeta.optional(),
  coeficientes: z.array(numeroEditor),
  simbolo: z.literal("Z"),
});

const esquemaRestriccionModelo = z.object({
  numero: z.number().int().positive(),
  nombre: nombreNoVacio,
  coeficientes: z.array(numeroEditor),
  relacion: esquemaRelacion,
  limite: numeroEditor,
});

const esquemaContextoAsistente = z.object({
  categoria: idCategoria,
  unidad: nombreNoVacio,
});

/**
 * Modelo de programación lineal completo (`ModeloLineal`). Reglas cruzadas de docs/03 §3.3
 * vía `superRefine`: cantidad de variables y restricciones, coherencia de longitudes,
 * restricción sin variables (bloqueante) y etiquetas duplicadas. La advertencia de "objetivo
 * todo en cero" NO se valida aquí (no bloquea el envío): ver `advertenciaObjetivoEnCero`.
 */
export const esquemaModelo = z
  .object({
    version: z.literal(1),
    titulo: nombreNoVacio.optional(),
    origen: z.enum(["asistente", "editor", "ejemplo"]),
    contexto: esquemaContextoAsistente.optional(),
    variables: z.array(esquemaVariableModelo),
    objetivo: esquemaObjetivoModelo,
    restricciones: z.array(esquemaRestriccionModelo),
    naturaleza: esquemaNaturaleza,
  })
  .superRefine((modelo, ctx) => {
    const cantidadVariables = modelo.variables.length;

    if (cantidadVariables < LIMITE_VARIABLES.minimo || cantidadVariables > LIMITE_VARIABLES.maximo) {
      agregarIssue(ctx, MSG_RANGO_VARIABLES, ["variables"]);
    }

    if (
      modelo.restricciones.length < LIMITE_RESTRICCIONES.minimo ||
      modelo.restricciones.length > LIMITE_RESTRICCIONES.maximo
    ) {
      agregarIssue(ctx, MSG_RANGO_RESTRICCIONES, ["restricciones"]);
    }

    verificarEtiquetasUnicas(
      modelo.variables.map((variable) => variable.etiqueta),
      ctx,
      (indice) => ["variables", indice, "etiqueta"],
    );

    if (modelo.objetivo.coeficientes.length !== cantidadVariables) {
      agregarIssue(ctx, MSG_ERROR_INTERNO_CANTIDAD_APORTES, ["objetivo", "coeficientes"]);
    }

    modelo.restricciones.forEach((restriccion, indice) => {
      if (restriccion.coeficientes.length !== cantidadVariables) {
        agregarIssue(ctx, MSG_ERROR_INTERNO_CANTIDAD_APORTES, [
          "restricciones",
          indice,
          "coeficientes",
        ]);
      }
      if (todosLosAportesSonCero(restriccion.coeficientes)) {
        agregarIssue(ctx, mensajeRestriccionSinVariables(indice + 1), [
          "restricciones",
          indice,
          "coeficientes",
        ]);
      }
    });
  });

/**
 * La advertencia de "objetivo con todos los aportes en cero" (docs/03 §3.3) NO bloquea el
 * envío del formulario: Zod no tiene "warnings" nativos, así que se expone aparte para que
 * el formulario la muestre como aviso no bloqueante. Devuelve `null` si no corresponde.
 */
export function advertenciaObjetivoEnCero(objetivo: { coeficientes: readonly string[] }): string | null {
  return todosLosAportesSonCero(objetivo.coeficientes) ? MSG_OBJETIVO_TODO_CERO : null;
}
