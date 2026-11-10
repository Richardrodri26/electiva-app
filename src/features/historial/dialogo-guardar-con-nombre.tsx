/**
 * `<DialogoGuardarConNombre>` (`features/historial/dialogo-guardar-con-nombre.tsx`) —
 * tarea T7.1, docs/06-ux-ui.md §3.4 (menú "⋯" → "Guardar con nombre (historial)").
 *
 * Diálogo controlado desde fuera (`open`/`onOpenChange`): quien lo usa
 * (`features/resultados/resultados-layout.tsx`) solo necesita un booleano de estado y el
 * `onClick` del ítem del menú, sin acoplar ese archivo compartido a la lógica del historial.
 *
 * Recibe `estado` ya resuelto (no el objeto de `useSolucionSimplex` completo): mientras el
 * Simplex no haya terminado (o haya fallado) `estado` es `undefined` y "Guardar" queda
 * deshabilitado — no debería pasar en la práctica (el usuario ya está viendo el resultado
 * cuando abre el menú "⋯"), pero evita guardar una entrada sin estado si algo tarda.
 *
 * El campo de nombre se reinicia a su valor por defecto cada vez que `open` pasa a `true`,
 * ajustando el estado DURANTE el render (no en un efecto: "Adjusting state based on a prop
 * change" de la guía de React, https://react.dev/learn/you-might-not-need-an-effect) — evita
 * el render en cascada que un `useEffect` con `setState` síncrono produciría. Ese valor por
 * defecto busca primero si este modelo (por `hashModelo`) ya tiene una entrada en el
 * historial: si la tiene, propone SU título (para no pisar en silencio un nombre que el
 * usuario ya haya puesto desde el panel del historial); si no, propone `modelo.titulo` o,
 * en su defecto, la función objetivo — mismo fallback que `tituloPorDefecto` de
 * `almacen-historial.ts`.
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { formatearFuncionObjetivoTexto } from "@/dominio/modelo/formato";
import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";

import { useGuardarEnHistorial, useHistorial } from "./use-historial";

export interface DialogoGuardarConNombreProps {
  open: boolean;
  onOpenChange: (valor: boolean) => void;
  modelo: ModeloLineal;
  /** `resultado.data?.estado` de `useSolucionSimplex`; `undefined` mientras no esté listo. */
  estado: EstadoSimplex | undefined;
}

export function DialogoGuardarConNombre({ open, onOpenChange, modelo, estado }: DialogoGuardarConNombreProps) {
  const guardar = useGuardarEnHistorial();
  const historial = useHistorial();
  const [titulo, setTitulo] = useState("");
  const [abiertoAntes, setAbiertoAntes] = useState(open);

  // Cada vez que `open` pasa de `false` a `true` (el diálogo se acaba de abrir), reinicia el
  // campo al valor por defecto — el modelo puede cambiar entre una apertura y la siguiente sin
  // que el componente se desmonte, así que no alcanza con inicializar `useState` una sola vez.
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      const entradaExistente = historial.data?.find((entrada) => entrada.hash === hashModelo(modelo));
      setTitulo(entradaExistente?.titulo ?? modelo.titulo ?? formatearFuncionObjetivoTexto(modelo));
    }
  }

  function manejarGuardar(): void {
    if (estado === undefined) {
      return;
    }
    const tituloFinal = titulo.trim().length > 0 ? titulo.trim() : formatearFuncionObjetivoTexto(modelo);
    guardar.mutate(
      { modelo, estado, titulo: tituloFinal },
      {
        onSuccess: () => {
          toast.success("Modelo guardado en el historial");
          onOpenChange(false);
        },
        onError: () => {
          toast.error("No se pudo guardar en el historial");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Guardar con nombre</DialogTitle>
          <DialogDescription>Este nombre se usa para encontrarlo en el historial.</DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="historial-guardar-titulo">Nombre</FieldLabel>
          <Input
            id="historial-guardar-titulo"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            maxLength={120}
            autoFocus
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                manejarGuardar();
              }
            }}
          />
        </Field>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button type="button" onClick={manejarGuardar} disabled={estado === undefined || guardar.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
