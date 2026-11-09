/**
 * Borrador del editor con autoguardado y carga inicial (`features/editor/use-borrador-editor.ts`).
 *
 * `useForm` de TanStack Form solo toma `defaultValues` UNA vez, al crear el formulario
 * (docs/02-arquitectura.md §3.3): por eso este hook separa dos cosas que `<Editor>` usa en
 * momentos distintos:
 *
 * - `borradorInicial`: el valor con el que se crea el formulario, calculado de forma
 *   SÍNCRONA y segura para SSR — si `?m=` trae un modelo válido se usa ese (editar un
 *   modelo existente manda sobre cualquier borrador guardado); si no, se arranca en blanco.
 *   nuqs resuelve `?m=` igual en servidor y cliente, así que esto no causa un desajuste de
 *   hidratación.
 * - `borradorRestaurado`: el borrador guardado en `localStorage` (`pl:borrador:editor`), que
 *   solo puede leerse recién montado en el cliente (en el servidor `localStorage` no existe)
 *   y SOLO si no se cargó desde `?m=`. `<Editor>` lo aplica con `form.reset(...)` cuando deja
 *   de ser `null` — ver el componente para el porqué de ese paso extra.
 *
 * Autoguardado (debounce 500 ms, docs/02 §3): `guardarBorrador` se llama desde `<Editor>` en
 * cada cambio de los valores del formulario (vía `form.Subscribe`); este hook es el único
 * que sabe la clave de `localStorage` y el tiempo de espera.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryState } from "nuqs";

import { borrar, guardar, leer } from "@/lib/almacenamiento";
import { CLAVE_MODELO, parseAsModelo } from "@/lib/url-state";

import { borradorDesdeModelo, crearBorradorEditor, esquemaBorradorEditor, type BorradorEditor } from "./estado";

export const CLAVE_BORRADOR_EDITOR = "pl:borrador:editor";
const DEMORA_AUTOGUARDADO_MS = 500;

export interface UseBorradorEditorResultado {
  /** Valor con el que crear el formulario (`useForm({ defaultValues: borradorInicial })`). */
  borradorInicial: BorradorEditor;
  /** `true` si `borradorInicial` vino de `?m=` (se está editando un modelo existente). */
  cargadoDesdeUrl: boolean;
  /** El borrador restaurado de `localStorage`, listo para aplicar con `form.reset(...)`; `null` hasta que esté disponible (o si no corresponde restaurar nada). */
  borradorRestaurado: BorradorEditor | null;
  /** Autoguardado con debounce; llamar en cada cambio de los valores del formulario. */
  guardarBorrador: (valor: BorradorEditor) => void;
  /** Borra el borrador autoguardado de `localStorage`. */
  limpiarBorradorGuardado: () => void;
}

export function useBorradorEditor(): UseBorradorEditorResultado {
  const [modeloUrl] = useQueryState(CLAVE_MODELO, parseAsModelo);
  const cargadoDesdeUrl = modeloUrl !== null;

  const [borradorInicial] = useState<BorradorEditor>(() =>
    modeloUrl !== null ? borradorDesdeModelo(modeloUrl) : crearBorradorEditor(),
  );

  const [borradorRestaurado, setBorradorRestaurado] = useState<BorradorEditor | null>(null);
  useEffect(() => {
    if (cargadoDesdeUrl) {
      return;
    }
    const guardado = leer(CLAVE_BORRADOR_EDITOR, esquemaBorradorEditor);
    if (guardado !== null) {
      // Sincroniza con `localStorage` (un store externo que no se puede leer durante el
      // render en el servidor): es, a propósito, el único lugar donde se aplica.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBorradorRestaurado(guardado);
    }
    // Solo al montar: `cargadoDesdeUrl` no debería cambiar durante la vida de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current !== null) {
        clearTimeout(temporizador.current);
      }
    },
    [],
  );

  function guardarBorrador(valor: BorradorEditor): void {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
    }
    temporizador.current = setTimeout(() => {
      guardar(CLAVE_BORRADOR_EDITOR, valor);
    }, DEMORA_AUTOGUARDADO_MS);
  }

  function limpiarBorradorGuardado(): void {
    borrar(CLAVE_BORRADOR_EDITOR);
  }

  return { borradorInicial, cargadoDesdeUrl, borradorRestaurado, guardarBorrador, limpiarBorradorGuardado };
}
