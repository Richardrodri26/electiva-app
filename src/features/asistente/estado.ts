/**
 * Estado puro del asistente paso a paso (`features/asistente/estado.ts`).
 *
 * Sin React: solo los tipos de "borrador" (lo que el usuario está escribiendo en cada
 * paso, antes de validar) y las funciones que validan cada paso con los esquemas Zod de
 * `dominio/modelo/esquemas.ts` y ensamblan el `ModeloLineal` final — mismo orden y mismas
 * reglas que `console-program/src/flow/*.ts` + `modelBuilder.ts` (ver AGENTS.md regla de
 * oro #6, docs/01-producto.md HU-01).
 *
 * Los componentes de cada paso (`paso-1-*.tsx`..`paso-4-*.tsx`) usan TanStack Form sobre
 * estos tipos de borrador; los validadores de campo (`onBlur`) usan los esquemas Zod
 * "hoja" (`numeroAsistente`, `nombreNoVacio`) para feedback inmediato, pero NO aplican los
 * `transform` de Zod. La normalización final (y las reglas cruzadas) se hacen acá, en el
 * submit de cada paso, con `safeParse` contra el esquema completo del paso — ver docs/03
 * §3.3 y la nota de la tarea T5.1.
 */

import type { z } from "zod";

import {
  FORMAS_CUMPLIMIENTO,
  TIPOS_RESTRICCION,
  UNIDADES,
  VALOR_TIPO_RESTRICCION_OTRA,
  VALOR_UNIDAD_OTRA,
  VERBOS_POR_CATEGORIA,
  naturalezaDesdeOpcion,
  relacionDesdeFormaCumplimiento,
  sentidoDesdeMeta,
} from "@/dominio/modelo/catalogos";
import {
  esquemaModelo,
  esquemaPasoNaturaleza,
  esquemaPasoObjetivo,
  esquemaPasoRestricciones,
  esquemaPasoVariables,
} from "@/dominio/modelo/esquemas";
import type {
  CategoriaId,
  MetaId,
  ModeloLineal,
  Objetivo,
  Restriccion,
  Variable,
} from "@/dominio/modelo/tipos";

// ---------------------------------------------------------------------------
// 1. Borradores — lo que el usuario está escribiendo en cada paso
// ---------------------------------------------------------------------------

export const CANTIDAD_OPCIONES_DEFECTO = 2;
export const CANTIDAD_OPCIONES_MINIMA = 2;
export const CANTIDAD_OPCIONES_MAXIMA = 6;
export const CANTIDAD_RESTRICCIONES_MINIMA = 1;
export const CANTIDAD_RESTRICCIONES_MAXIMA = 6;

/** Borrador del paso 1 — `console-program/src/flow/definirVariables.ts`. */
export interface BorradorPaso1 {
  categoria: CategoriaId | null;
  /** Una entrada por opción a comparar (2 a 6). */
  nombresOpciones: string[];
  /** Valor del catálogo `UNIDADES` elegido (1..6). */
  unidadId: number;
  /** Solo se usa (y se exige) cuando `unidadId === VALOR_UNIDAD_OTRA`. */
  unidadOtra: string;
}

/** Borrador del paso 2 — `console-program/src/flow/definirObjetivo.ts`. */
export interface BorradorPaso2 {
  meta: MetaId | null;
  /** Un aporte por opción, mismo orden que `BorradorPaso1.nombresOpciones`. */
  coeficientes: string[];
}

/** Borrador de una limitación — `console-program/src/flow/definirRestricciones.ts`. */
export interface BorradorRestriccion {
  /** Valor del catálogo `TIPOS_RESTRICCION` elegido (1..8). */
  tipo: number;
  /** Solo se usa (y se exige) cuando `tipo === VALOR_TIPO_RESTRICCION_OTRA`. */
  nombrePersonalizado: string;
  coeficientes: string[];
  limite: string;
  /** Valor del catálogo `FORMAS_CUMPLIMIENTO` elegido (1..3). */
  formaCumplimiento: number;
}

/** Borrador del paso 3 — 1 a 6 limitaciones (decisión confirmada, ver `esquemas.ts`). */
export interface BorradorPaso3 {
  restricciones: BorradorRestriccion[];
}

/** Borrador del paso 4 — `console-program/src/flow/definirNaturaleza.ts`. */
export interface BorradorPaso4 {
  /** Valor del catálogo `OPCIONES_NATURALEZA` elegido (1 o 2). */
  naturaleza: number;
}

export interface BorradorAsistente {
  paso1: BorradorPaso1;
  paso2: BorradorPaso2;
  paso3: BorradorPaso3;
  paso4: BorradorPaso4;
}

// ---------------------------------------------------------------------------
// 2. Fábricas de borradores vacíos
// ---------------------------------------------------------------------------

/** `cantidad` nombres de opción vacíos, para inicializar o redimensionar el paso 1. */
export function crearNombresOpcionesVacios(cantidad: number): string[] {
  return Array.from({ length: cantidad }, () => "");
}

export function crearBorradorPaso1(): BorradorPaso1 {
  return {
    categoria: null,
    nombresOpciones: crearNombresOpcionesVacios(CANTIDAD_OPCIONES_DEFECTO),
    unidadId: UNIDADES[0]!.valor,
    unidadOtra: "",
  };
}

/** `cantidad` aportes vacíos, para inicializar o redimensionar el paso 2 y cada limitación. */
export function crearCoeficientesVacios(cantidad: number): string[] {
  return Array.from({ length: cantidad }, () => "");
}

export function crearBorradorPaso2(cantidadOpciones: number): BorradorPaso2 {
  return { meta: null, coeficientes: crearCoeficientesVacios(cantidadOpciones) };
}

export function crearRestriccionVacia(cantidadOpciones: number): BorradorRestriccion {
  return {
    tipo: TIPOS_RESTRICCION[0]!.valor,
    nombrePersonalizado: "",
    coeficientes: crearCoeficientesVacios(cantidadOpciones),
    limite: "",
    formaCumplimiento: FORMAS_CUMPLIMIENTO[0]!.valor,
  };
}

export function crearBorradorPaso3(cantidadOpciones: number): BorradorPaso3 {
  return { restricciones: [crearRestriccionVacia(cantidadOpciones)] };
}

export function crearBorradorPaso4(): BorradorPaso4 {
  return { naturaleza: 1 };
}

export function crearBorradorAsistente(): BorradorAsistente {
  return {
    paso1: crearBorradorPaso1(),
    paso2: crearBorradorPaso2(CANTIDAD_OPCIONES_DEFECTO),
    paso3: crearBorradorPaso3(CANTIDAD_OPCIONES_DEFECTO),
    paso4: crearBorradorPaso4(),
  };
}

/**
 * Paso 5 — "Corregir las opciones" (sección `'variables'` de `resumenYConfirmacion.ts`,
 * ver el `case 'variables'` de `console-program/src/modelBuilder.ts`): al cambiar
 * nombres/cantidad/unidad, los aportes (paso 2) y las limitaciones (paso 3) quedan
 * inconsistentes (están indexados a las opciones actuales) y se borran por completo —
 * decisión #2 confirmada para la tarea T5.2. La naturaleza (paso 4) NO se toca, igual
 * que en el CLI. El paso 1 tampoco se borra (a diferencia del CLI, que vuelve a
 * preguntar desde cero): en el stepper el usuario vuelve a verlo con lo que ya había
 * escrito, y puede editarlo o dejarlo igual antes de continuar.
 *
 * Los nuevos borradores vacíos de los pasos 2 y 3 se dimensionan a la cantidad de
 * opciones ACTUAL de `borrador.paso1` (si el usuario cambia la cantidad al reeditar el
 * paso 1, `<Asistente>` ya reajusta esos arrays al continuar, igual que en el flujo
 * normal hacia adelante).
 */
export function limpiarParaCorregirOpciones(borrador: BorradorAsistente): BorradorAsistente {
  const cantidadActual = borrador.paso1.nombresOpciones.length;
  return {
    ...borrador,
    paso2: crearBorradorPaso2(cantidadActual),
    paso3: crearBorradorPaso3(cantidadActual),
  };
}

// ---------------------------------------------------------------------------
// 3. Resolución de "Otra" (unidad / tipo de limitación)
// ---------------------------------------------------------------------------

/**
 * Texto final de la unidad: la etiqueta del catálogo, o lo escrito a mano si se elige
 * "Otra" — igual que `definirVariables.ts` (`unidadValor === 6 → preguntarTexto`).
 */
export function resolverUnidad(borrador: BorradorPaso1): string {
  if (borrador.unidadId === VALOR_UNIDAD_OTRA) {
    return borrador.unidadOtra;
  }
  const opcion = UNIDADES.find((unidad) => unidad.valor === borrador.unidadId);
  return opcion?.etiqueta ?? "";
}

/**
 * Nombre final de una limitación: la etiqueta del catálogo, o lo escrito a mano si se
 * elige "Otra" — igual que `definirRestricciones.ts` (`tipoValor === 8 → preguntarTexto`).
 */
export function resolverNombreRestriccion(restriccion: BorradorRestriccion): string {
  if (restriccion.tipo === VALOR_TIPO_RESTRICCION_OTRA) {
    return restriccion.nombrePersonalizado;
  }
  const opcion = TIPOS_RESTRICCION.find((tipo) => tipo.valor === restriccion.tipo);
  return opcion?.etiqueta ?? "";
}

// ---------------------------------------------------------------------------
// 4. Validación por paso (safeParse contra el esquema del paso)
// ---------------------------------------------------------------------------

export function validarPaso1(borrador: BorradorPaso1) {
  return esquemaPasoVariables.safeParse({
    categoria: borrador.categoria,
    unidad: resolverUnidad(borrador),
    nombresOpciones: borrador.nombresOpciones,
  });
}

export function validarPaso2(borrador: BorradorPaso2) {
  return esquemaPasoObjetivo.safeParse({
    meta: borrador.meta,
    coeficientes: borrador.coeficientes,
  });
}

export function validarPaso3(borrador: BorradorPaso3) {
  return esquemaPasoRestricciones.safeParse({
    restricciones: borrador.restricciones.map((restriccion) => ({
      tipo: restriccion.tipo,
      // `esquemaRestriccionAsistente` solo exige `nombrePersonalizado` cuando `tipo === 8`;
      // si no corresponde, se omite para no disparar su propio `nombreNoVacio` por las dudas.
      nombrePersonalizado:
        restriccion.tipo === VALOR_TIPO_RESTRICCION_OTRA ? restriccion.nombrePersonalizado : undefined,
      coeficientes: restriccion.coeficientes,
      limite: restriccion.limite,
      formaCumplimiento: restriccion.formaCumplimiento,
    })),
  });
}

export function validarPaso4(borrador: BorradorPaso4) {
  return esquemaPasoNaturaleza.safeParse({
    naturaleza: naturalezaDesdeOpcion(borrador.naturaleza),
  });
}

// ---------------------------------------------------------------------------
// 5. Ensamblado del ModeloLineal final — `console-program/src/modelBuilder.ts`
// ---------------------------------------------------------------------------

type SalidaPaso1 = z.infer<typeof esquemaPasoVariables>;
type SalidaPaso2 = z.infer<typeof esquemaPasoObjetivo>;
type SalidaPaso3 = z.infer<typeof esquemaPasoRestricciones>;

/**
 * Variables de decisión a partir del paso 1 ya validado — mismo armado que el final de
 * `definirVariables.ts`: verbo según la categoría, sufijo de unidad salvo "Unidades".
 */
export function construirVariables(paso1: SalidaPaso1): Variable[] {
  const verbo = VERBOS_POR_CATEGORIA[paso1.categoria];
  const mostrarUnidad = paso1.unidad.trim().toLowerCase() !== "unidades";
  const sufijoUnidad = mostrarUnidad ? ` (medidas en ${paso1.unidad.toLowerCase()})` : "";
  return paso1.nombresOpciones.map((nombreOpcion, i) => {
    const indice = i + 1;
    return {
      nombre: `x${indice}`,
      etiqueta: nombreOpcion,
      definicion: `x${indice} = cantidad de ${nombreOpcion} que se ${verbo}${sufijoUnidad}.`,
    };
  });
}

/** Función objetivo a partir del paso 2 ya validado — `definirObjetivo.ts`. */
export function construirObjetivo(paso2: SalidaPaso2): Objetivo {
  return {
    sentido: sentidoDesdeMeta(paso2.meta),
    meta: paso2.meta,
    coeficientes: paso2.coeficientes,
    simbolo: "Z",
  };
}

/** Limitaciones a partir del paso 3 ya validado — `definirRestricciones.ts`. */
export function construirRestricciones(paso3: SalidaPaso3, borrador: BorradorPaso3): Restriccion[] {
  return paso3.restricciones.map((restriccion, i) => {
    const nombre = resolverNombreRestriccion(borrador.restricciones[i]!);
    return {
      numero: i + 1,
      nombre,
      coeficientes: restriccion.coeficientes,
      relacion: relacionDesdeFormaCumplimiento(restriccion.formaCumplimiento),
      limite: restriccion.limite,
    };
  });
}

export interface ConstruirModeloExito {
  ok: true;
  modelo: ModeloLineal;
}

export interface ConstruirModeloError {
  ok: false;
  /** Paso donde falló la validación (1..4), para saber a dónde mandar al usuario. */
  paso: 1 | 2 | 3 | 4;
}

/**
 * Valida los 4 pasos (en orden) y, si todos son válidos, ensambla y valida el
 * `ModeloLineal` final contra `esquemaModelo` (Zod es la única fuente de validación,
 * AGENTS.md regla de oro #3). Pensada para el submit del paso 4 (que entrega el modelo
 * completo al resumen/paso 5) y para pruebas de integración.
 */
export function construirModeloDesdeAsistente(borrador: BorradorAsistente): ConstruirModeloExito | ConstruirModeloError {
  const resultadoPaso1 = validarPaso1(borrador.paso1);
  if (!resultadoPaso1.success) {
    return { ok: false, paso: 1 };
  }
  const resultadoPaso2 = validarPaso2(borrador.paso2);
  if (!resultadoPaso2.success) {
    return { ok: false, paso: 2 };
  }
  const resultadoPaso3 = validarPaso3(borrador.paso3);
  if (!resultadoPaso3.success) {
    return { ok: false, paso: 3 };
  }
  const resultadoPaso4 = validarPaso4(borrador.paso4);
  if (!resultadoPaso4.success) {
    return { ok: false, paso: 4 };
  }

  const variables = construirVariables(resultadoPaso1.data);
  const modeloPropuesto: ModeloLineal = {
    version: 1,
    origen: "asistente",
    contexto: { categoria: resultadoPaso1.data.categoria, unidad: resultadoPaso1.data.unidad },
    variables,
    objetivo: construirObjetivo(resultadoPaso2.data),
    restricciones: construirRestricciones(resultadoPaso3.data, borrador.paso3),
    naturaleza: resultadoPaso4.data.naturaleza,
  };

  const resultadoModelo = esquemaModelo.safeParse(modeloPropuesto);
  if (!resultadoModelo.success) {
    // No debería ocurrir si los 4 pasos validaron individualmente: señal de bug interno,
    // no de dato de usuario. Se reporta como fallo del paso 4 (el último que se tocó).
    return { ok: false, paso: 4 };
  }

  return { ok: true, modelo: resultadoModelo.data };
}
