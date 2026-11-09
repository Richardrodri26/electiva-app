/**
 * Navegación por teclado de la grilla de coeficientes (`features/editor/navegacion-grilla.ts`)
 * — docs/06-ux-ui.md §3.3: "Navegación con Tab y flechas (Enter baja a la fila siguiente)".
 *
 * Fila 0 = la fila del objetivo (Z); fila k (k ≥ 1) = la restricción en la posición k-1.
 * Columna = índice de variable (0-based). Tab usa el orden natural del DOM (no se
 * intercepta): alcanza para recorrer la grilla de izquierda a derecha y de fila en fila.
 *
 * `siguienteCeldaParaTecla` es la decisión PURA (qué celda enfocar, o `null` si la tecla no
 * mueve nada) — sin DOM, para poder probarla sin `jsdom` (no está en el stack del proyecto,
 * AGENTS.md regla de oro #7). `manejarTeclaCelda` es el glue code que lee la posición real
 * del cursor del `<input>` y mueve el foco; no se prueba con unitarios (depende del DOM real
 * del navegador), se verifica a ojo en `pnpm dev` (ver resumen de la tarea).
 *
 * Izquierda/derecha solo cambian de celda cuando el cursor ya está en el borde del texto
 * (inicio/fin): si hay texto para recorrer dentro del número, las flechas mueven el cursor
 * como en cualquier campo de texto, en vez de "robárselo" siempre. Arriba/abajo y Enter
 * siempre cambian de fila (no tienen otro uso dentro de un campo de una sola línea) —
 * decisión de UX razonable para una grilla de celdas que siguen siendo texto editable,
 * reportada como tal en el resumen de la tarea (docs/06 §3.3 no especifica este detalle).
 */

export interface LimitesGrilla {
  /** Cantidad de restricciones (fila 0 es el objetivo; la última fila válida es `totalFilas`). */
  totalFilas: number;
  /** Cantidad de variables (columnas 0..totalColumnas-1). */
  totalColumnas: number;
}

export interface PosicionCelda {
  fila: number;
  columna: number;
}

export interface PosicionCaret {
  alInicio: boolean;
  alFinal: boolean;
}

const TECLAS_MANEJADAS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"] as const;
export type TeclaManejada = (typeof TECLAS_MANEJADAS)[number];

export function esTeclaManejada(tecla: string): tecla is TeclaManejada {
  return (TECLAS_MANEJADAS as readonly string[]).includes(tecla);
}

/**
 * Decide a qué celda moverse (o `null` si corresponde no moverse) para `tecla`, sin tocar el
 * DOM. `Enter` siempre se "maneja" (nunca debe enviar el formulario desde la grilla), aunque
 * en la última fila no mueva el foco a ningún lado — quien llame siempre debe prevenir el
 * comportamiento por defecto para `Enter`.
 */
export function siguienteCeldaParaTecla(
  tecla: TeclaManejada,
  posicion: PosicionCelda,
  limites: LimitesGrilla,
  caret: PosicionCaret,
): PosicionCelda | null {
  const { fila, columna } = posicion;

  switch (tecla) {
    case "ArrowUp":
      return fila > 0 ? { fila: fila - 1, columna } : null;
    case "ArrowDown":
      return fila < limites.totalFilas ? { fila: fila + 1, columna } : null;
    case "Enter":
      return fila < limites.totalFilas ? { fila: fila + 1, columna } : null;
    case "ArrowLeft":
      return columna > 0 && caret.alInicio ? { fila, columna: columna - 1 } : null;
    case "ArrowRight":
      return columna < limites.totalColumnas - 1 && caret.alFinal ? { fila, columna: columna + 1 } : null;
  }
}

export function idCeldaCoeficiente(fila: number, columna: number): string {
  return `celda-coef-${fila}-${columna}`;
}

/** Glue code con el DOM real: lee el cursor del input, decide y mueve el foco. No se prueba con unitarios (ver cabecera). */
export function manejarTeclaCelda(
  evento: { key: string; preventDefault: () => void; currentTarget: HTMLInputElement },
  posicion: PosicionCelda,
  limites: LimitesGrilla,
): void {
  if (!esTeclaManejada(evento.key)) {
    return;
  }

  const input = evento.currentTarget;
  const caret: PosicionCaret = {
    alInicio: input.selectionStart === 0 && input.selectionEnd === 0,
    alFinal: input.selectionStart === input.value.length && input.selectionEnd === input.value.length,
  };

  const destino = siguienteCeldaParaTecla(evento.key, posicion, limites, caret);

  if (evento.key === "Enter") {
    evento.preventDefault();
  }

  if (destino === null) {
    return;
  }

  evento.preventDefault();
  const elemento = document.getElementById(idCeldaCoeficiente(destino.fila, destino.columna));
  if (elemento instanceof HTMLInputElement) {
    elemento.focus();
    elemento.select();
  }
}
