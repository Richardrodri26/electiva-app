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
 * - `borradorPendiente`: el borrador guardado en `localStorage` (`pl:borrador:editor`), que NO se
 *   aplica en silencio: se ofrece con el banner compartido ("Tiene un modelo sin terminar" /
 *   "Retomar el modelo" / "Descartar"), igual que el asistente. Solo se ofrece sin `?m=`, si
 *   no está en blanco y mientras no se haya resuelto el banner; mientras está pendiente el
 *   autoguardado queda suspendido para no pisarlo con el formulario vacío.
 *
 * Autoguardado (debounce 500 ms, docs/02 §3): `guardarBorrador` se llama desde `<Editor>` en
 * cada cambio de los valores del formulario (vía `form.Subscribe`); este hook es el único
 * que sabe la clave de `localStorage` y el tiempo de espera.
 */

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryState } from "nuqs";

import {
  borrar,
  crearInstantaneaAlmacenada,
  guardar,
  instantaneaServidorVacia,
  suscribirACambiosDeAlmacenamiento,
} from "@/lib/almacenamiento";
import { CLAVE_MODELO, parseAsModelo } from "@/lib/url-state";

import { borradorDesdeModelo, crearBorradorEditor, esquemaBorradorEditor, type BorradorEditor } from "./estado";

export const CLAVE_BORRADOR_EDITOR = "pl:borrador:editor";
const DEMORA_AUTOGUARDADO_MS = 500;

export interface UseBorradorEditorResultado {
  /** Valor con el que crear el formulario (`useForm({ defaultValues: borradorInicial })`). */
  borradorInicial: BorradorEditor;
  /** `true` si `borradorInicial` vino de `?m=` (se está editando un modelo existente). */
  cargadoDesdeUrl: boolean;
  /** El borrador sin terminar guardado en `localStorage` que se ofrece con el banner; `null` si no hay nada que ofrecer (sin borrador, en blanco, ya resuelto o con `?m=`). */
  borradorPendiente: BorradorEditor | null;
  /** "Retomar el modelo": oculta el banner y devuelve el borrador para aplicar con `form.reset(...)`. */
  retomarBorradorPendiente: () => BorradorEditor | null;
  /** "Descartar": borra el borrador guardado y oculta el banner (el formulario sigue en blanco). */
  descartarBorradorPendiente: () => void;
  /** Autoguardado con debounce; llamar en cada cambio de los valores del formulario. */
  guardarBorrador: (valor: BorradorEditor) => void;
  /** Borra el borrador autoguardado de `localStorage`. */
  limpiarBorradorGuardado: () => void;
}

/** `getSnapshot` estable del borrador guardado (ver `crearInstantaneaAlmacenada`). */
const obtenerInstantaneaBorradorEditor = crearInstantaneaAlmacenada(CLAVE_BORRADOR_EDITOR, esquemaBorradorEditor);

/** `true` si el borrador guardado no aporta nada que ofrecer retomar (igual al formulario en blanco). */
function esBorradorEnBlanco(borrador: BorradorEditor): boolean {
  return JSON.stringify(borrador) === JSON.stringify(crearBorradorEditor());
}

export function useBorradorEditor(): UseBorradorEditorResultado {
  const [modeloUrl] = useQueryState(CLAVE_MODELO, parseAsModelo);
  const cargadoDesdeUrl = modeloUrl !== null;

  const [borradorInicial] = useState<BorradorEditor>(() =>
    modeloUrl !== null ? borradorDesdeModelo(modeloUrl) : crearBorradorEditor(),
  );

  // El borrador guardado se lee con `useSyncExternalStore` (igual que el asistente): el
  // snapshot del servidor es `null`, así que no hay desajuste de hidratación. Nunca se
  // aplica solo: se ofrece con el banner y el formulario arranca en blanco.
  const guardado = useSyncExternalStore(
    suscribirACambiosDeAlmacenamiento,
    obtenerInstantaneaBorradorEditor,
    instantaneaServidorVacia,
  );
  const [bannerResuelto, setBannerResuelto] = useState(false);
  // Con `?m=` manda el modelo de la URL: no se ofrece ningún borrador.
  const borradorPendiente =
    cargadoDesdeUrl || bannerResuelto || guardado === null || esBorradorEnBlanco(guardado) ? null : guardado;

  // Mientras el banner está pendiente el autoguardado NO puede pisar el borrador guardado
  // con el formulario en blanco. Va en una ref (y no en el estado) A PROPÓSITO: así
  // `guardarBorrador` y `limpiarBorradorGuardado` conservan su identidad entre renders.
  // `<Editor>` los usa en las opciones de `useForm`; si cambiaran, TanStack Form volvería a
  // aplicar `defaultValues` (el formulario en blanco) encima de lo que dejó `form.reset(...)`.
  const bloqueado = useRef(false);
  useEffect(() => {
    bloqueado.current = borradorPendiente !== null;
  }, [borradorPendiente]);

  function retomarBorradorPendiente(): BorradorEditor | null {
    bloqueado.current = false;
    setBannerResuelto(true);
    return borradorPendiente;
  }

  function descartarBorradorPendiente(): void {
    bloqueado.current = false;
    borrar(CLAVE_BORRADOR_EDITOR);
    setBannerResuelto(true);
  }

  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (temporizador.current !== null) {
        clearTimeout(temporizador.current);
      }
    },
    [],
  );

  // true una vez que el modelo se envió a resolver: ningún autoguardado pendiente o tardío
  // debe volver a escribir el borrador que se acaba de descartar.
  const descartado = useRef(false);

  function guardarBorrador(valor: BorradorEditor): void {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    if (descartado.current || bloqueado.current) {
      return;
    }
    temporizador.current = setTimeout(() => {
      if (bloqueado.current || descartado.current) {
        return;
      }
      guardar(CLAVE_BORRADOR_EDITOR, valor);
    }, DEMORA_AUTOGUARDADO_MS);
  }

  function limpiarBorradorGuardado(): void {
    descartado.current = true;
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    borrar(CLAVE_BORRADOR_EDITOR);
  }

  return {
    borradorInicial,
    cargadoDesdeUrl,
    borradorPendiente,
    retomarBorradorPendiente,
    descartarBorradorPendiente,
    guardarBorrador,
    limpiarBorradorGuardado,
  };
}
