/**
 * Estado puro del editor técnico directo (`features/editor/estado.ts`).
 *
 * Sin React (regla de oro #1 de AGENTS.md): el "borrador" que edita `<Editor>` con
 * TanStack Form, las fábricas de valores por defecto (docs/03-dominio-y-validacion.md §2:
 * etiqueta `x{i}`, nombre de restricción `"Restricción {n}"`), las funciones que
 * agregan/quitan variables y restricciones preservando el resto de los datos, y el
 * ensamblado final del `ModeloLineal` contra `esquemaModelo`.
 *
 * Mismo patrón que `features/asistente/estado.ts`: los validadores de campo (`onBlur`) de
 * los componentes usan los esquemas Zod "hoja" (`numeroEditor`, `nombreNoVacio`) para
 * feedback inmediato, pero NO aplican los `transform` de Zod. La normalización final —acá,
 * completar el nombre de restricción vacío con el default ANTES de validar (decisión
 * confirmada: nunca falla por estar vacío)— se hace en `validarEditor`, llamada desde el
 * `onSubmit` del formulario.
 */

import { z } from "zod";

import { LIMITE_RESTRICCIONES, LIMITE_VARIABLES, esquemaEditor } from "@/dominio/modelo/esquemas";
import { esquemaModelo } from "@/dominio/modelo/esquemas";
import type { ModeloLineal, Naturaleza, Relacion, Sentido, Variable } from "@/dominio/modelo/tipos";

// ---------------------------------------------------------------------------
// 1. Borrador — lo que el usuario está escribiendo en el editor
// ---------------------------------------------------------------------------

export const CANTIDAD_VARIABLES_DEFECTO = 2;
export const CANTIDAD_RESTRICCIONES_DEFECTO = 1;

export interface BorradorVariableEditor {
  etiqueta: string;
  definicion: string;
}

export interface BorradorRestriccionEditor {
  nombre: string;
  /** Un aporte por variable, mismo orden que `BorradorEditor.variables`. */
  coeficientes: string[];
  relacion: Relacion;
  limite: string;
}

export interface BorradorEditor {
  variables: BorradorVariableEditor[];
  sentido: Sentido;
  /** Un aporte por variable, mismo orden que `variables`. */
  coeficientesObjetivo: string[];
  restricciones: BorradorRestriccionEditor[];
  naturaleza: Naturaleza;
}

/**
 * Esquema ESTRUCTURAL del borrador (para guardarlo/leerlo de `localStorage`, ver
 * `lib/almacenamiento.ts`). Deliberadamente NO usa `numeroEditor`/`nombreNoVacio`: un
 * borrador a medio escribir puede tener texto inválido en cualquier campo (ej. "1/" mientras
 * el usuario termina de tipear) y eso no debe impedir que se guarde o se restaure — la
 * validación "de verdad" (`validarEditor`) solo se exige al enviar el formulario.
 */
export const esquemaBorradorEditor: z.ZodType<BorradorEditor> = z.object({
  variables: z.array(z.object({ etiqueta: z.string(), definicion: z.string() })),
  sentido: z.enum(["max", "min"]),
  coeficientesObjetivo: z.array(z.string()),
  restricciones: z.array(
    z.object({
      nombre: z.string(),
      coeficientes: z.array(z.string()),
      relacion: z.enum(["<=", ">=", "="]),
      limite: z.string(),
    }),
  ),
  naturaleza: z.enum(["entera", "fraccionaria"]),
});

// ---------------------------------------------------------------------------
// 2. Fábricas de valores por defecto — docs/03 §2
// ---------------------------------------------------------------------------

/** Etiqueta por defecto de la variable en la posición `indice` (1-based): `"x{i}"`. */
export function etiquetaVariablePorDefecto(indice: number): string {
  return `x${indice}`;
}

/** Definición por defecto de la variable en la posición `indice` (1-based), editable. */
export function definicionVariablePorDefecto(indice: number): string {
  return `x${indice} = variable de decisión ${indice}.`;
}

/** Nombre por defecto de la restricción en la posición `numero` (1-based): `"Restricción {n}"`. */
export function nombreRestriccionPorDefecto(numero: number): string {
  return `Restricción ${numero}`;
}

export function crearVariableEditor(indice: number): BorradorVariableEditor {
  return { etiqueta: etiquetaVariablePorDefecto(indice), definicion: definicionVariablePorDefecto(indice) };
}

/** `cantidad` aportes vacíos, para inicializar o redimensionar el objetivo y cada restricción. */
export function crearCoeficientesEditorVacios(cantidad: number): string[] {
  return Array.from({ length: cantidad }, () => "");
}

/**
 * Restricción nueva, con el nombre en blanco (NO con el default ya escrito): el default se
 * completa recién al validar (`validarEditor`), así el usuario ve un campo vacío con
 * placeholder, igual que en el mockup de docs/06-ux-ui.md §3.3 (R2 y R3 sin nombre).
 */
export function crearRestriccionEditor(cantidadVariables: number): BorradorRestriccionEditor {
  return { nombre: "", coeficientes: crearCoeficientesEditorVacios(cantidadVariables), relacion: "<=", limite: "" };
}

export function crearBorradorEditor(): BorradorEditor {
  const variables = Array.from({ length: CANTIDAD_VARIABLES_DEFECTO }, (_, i) => crearVariableEditor(i + 1));
  return {
    variables,
    sentido: "max",
    coeficientesObjetivo: crearCoeficientesEditorVacios(CANTIDAD_VARIABLES_DEFECTO),
    restricciones: Array.from({ length: CANTIDAD_RESTRICCIONES_DEFECTO }, () =>
      crearRestriccionEditor(CANTIDAD_VARIABLES_DEFECTO),
    ),
    naturaleza: "fraccionaria",
  };
}

// ---------------------------------------------------------------------------
// 3. Agregar/quitar variables y restricciones, preservando el resto de los datos
// ---------------------------------------------------------------------------

export function puedeAgregarVariable(borrador: BorradorEditor): boolean {
  return borrador.variables.length < LIMITE_VARIABLES.maximo;
}

export function puedeQuitarVariable(borrador: BorradorEditor): boolean {
  return borrador.variables.length > LIMITE_VARIABLES.minimo;
}

/** Agrega una variable al final (con sus valores por defecto) y una columna de coeficiente en cada fila. */
export function agregarVariable(borrador: BorradorEditor): BorradorEditor {
  if (!puedeAgregarVariable(borrador)) {
    return borrador;
  }
  const siguienteIndice = borrador.variables.length + 1;
  return {
    ...borrador,
    variables: [...borrador.variables, crearVariableEditor(siguienteIndice)],
    coeficientesObjetivo: [...borrador.coeficientesObjetivo, ""],
    restricciones: borrador.restricciones.map((restriccion) => ({
      ...restriccion,
      coeficientes: [...restriccion.coeficientes, ""],
    })),
  };
}

/** Quita la variable en `indice` (0-based) y su columna de coeficiente en cada fila. */
export function quitarVariable(borrador: BorradorEditor, indice: number): BorradorEditor {
  if (!puedeQuitarVariable(borrador)) {
    return borrador;
  }
  return {
    ...borrador,
    variables: borrador.variables.filter((_, i) => i !== indice),
    coeficientesObjetivo: borrador.coeficientesObjetivo.filter((_, i) => i !== indice),
    restricciones: borrador.restricciones.map((restriccion) => ({
      ...restriccion,
      coeficientes: restriccion.coeficientes.filter((_, i) => i !== indice),
    })),
  };
}

export function puedeAgregarRestriccion(borrador: BorradorEditor): boolean {
  return borrador.restricciones.length < LIMITE_RESTRICCIONES.maximo;
}

export function puedeQuitarRestriccion(borrador: BorradorEditor): boolean {
  return borrador.restricciones.length > LIMITE_RESTRICCIONES.minimo;
}

/** Agrega una restricción vacía al final, con una columna de coeficiente por variable actual. */
export function agregarRestriccion(borrador: BorradorEditor): BorradorEditor {
  if (!puedeAgregarRestriccion(borrador)) {
    return borrador;
  }
  return { ...borrador, restricciones: [...borrador.restricciones, crearRestriccionEditor(borrador.variables.length)] };
}

/** Quita la restricción en `indice` (0-based); las demás conservan sus datos. */
export function quitarRestriccion(borrador: BorradorEditor, indice: number): BorradorEditor {
  if (!puedeQuitarRestriccion(borrador)) {
    return borrador;
  }
  return { ...borrador, restricciones: borrador.restricciones.filter((_, i) => i !== indice) };
}

// ---------------------------------------------------------------------------
// 4. Validación y ensamblado del ModeloLineal final
// ---------------------------------------------------------------------------

/**
 * Completa el nombre de cada restricción vacía con el default `"Restricción {n}"` ANTES de
 * validar con Zod — decisión confirmada: un nombre vacío nunca hace fallar la validación.
 */
function normalizarParaValidar(borrador: BorradorEditor) {
  return {
    variables: borrador.variables,
    sentido: borrador.sentido,
    coeficientesObjetivo: borrador.coeficientesObjetivo,
    restricciones: borrador.restricciones.map((restriccion, indice) => ({
      ...restriccion,
      nombre: restriccion.nombre.trim() === "" ? nombreRestriccionPorDefecto(indice + 1) : restriccion.nombre,
    })),
    naturaleza: borrador.naturaleza,
  };
}

/** Valida el borrador completo contra `esquemaEditor` (con el nombre de restricción ya completado). */
export function validarEditor(borrador: BorradorEditor) {
  return esquemaEditor.safeParse(normalizarParaValidar(borrador));
}

export interface ConstruirModeloEditorExito {
  ok: true;
  modelo: ModeloLineal;
}

export interface ConstruirModeloEditorError {
  ok: false;
  errores: z.ZodError;
}

/**
 * Valida el borrador y, si es válido, ensambla el `ModeloLineal` final (`origen: "editor"`,
 * siempre: el modelo se está resolviendo a través del editor técnico, sea que el borrador
 * se haya iniciado en blanco, desde `?m=` o desde un ejemplo de clase) y lo vuelve a validar
 * contra `esquemaModelo` (Zod es la única fuente de validación, AGENTS.md regla de oro #3).
 */
export function construirModeloDesdeEditor(
  borrador: BorradorEditor,
): ConstruirModeloEditorExito | ConstruirModeloEditorError {
  const resultado = validarEditor(borrador);
  if (!resultado.success) {
    return { ok: false, errores: resultado.error };
  }

  const datos = resultado.data;
  const variables: Variable[] = datos.variables.map((variable, indice) => ({
    nombre: `x${indice + 1}`,
    etiqueta: variable.etiqueta,
    definicion: variable.definicion,
  }));

  const modeloPropuesto: ModeloLineal = {
    version: 1,
    origen: "editor",
    variables,
    objetivo: { sentido: datos.sentido, coeficientes: datos.coeficientesObjetivo, simbolo: "Z" },
    restricciones: datos.restricciones.map((restriccion, indice) => ({
      numero: indice + 1,
      nombre: restriccion.nombre,
      coeficientes: restriccion.coeficientes,
      relacion: restriccion.relacion,
      limite: restriccion.limite,
    })),
    naturaleza: datos.naturaleza,
  };

  const resultadoModelo = esquemaModelo.safeParse(modeloPropuesto);
  if (!resultadoModelo.success) {
    // No debería ocurrir si `esquemaEditor` ya validó: señal de bug interno.
    return { ok: false, errores: resultadoModelo.error };
  }

  return { ok: true, modelo: resultadoModelo.data };
}

// ---------------------------------------------------------------------------
// 5. ModeloLineal → BorradorEditor (carga inicial desde `?m=` o desde un ejemplo)
// ---------------------------------------------------------------------------

export function borradorDesdeModelo(modelo: ModeloLineal): BorradorEditor {
  return {
    variables: modelo.variables.map((variable) => ({ etiqueta: variable.etiqueta, definicion: variable.definicion })),
    sentido: modelo.objetivo.sentido,
    coeficientesObjetivo: [...modelo.objetivo.coeficientes],
    restricciones: modelo.restricciones.map((restriccion) => ({
      nombre: restriccion.nombre,
      coeficientes: [...restriccion.coeficientes],
      relacion: restriccion.relacion,
      limite: restriccion.limite,
    })),
    naturaleza: modelo.naturaleza,
  };
}

// ---------------------------------------------------------------------------
// 6. Reglas de habilitación de "Método gráfico" — docs/06-ux-ui.md §3.3
// ---------------------------------------------------------------------------

export const CANTIDAD_VARIABLES_METODO_GRAFICO = 2;

/** El botón "Método gráfico" solo se habilita con exactamente 2 variables. */
export function tieneExactamenteDosVariables(borrador: BorradorEditor): boolean {
  return borrador.variables.length === CANTIDAD_VARIABLES_METODO_GRAFICO;
}
