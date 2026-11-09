/**
 * Paso 5 del asistente — "Revisar" (`features/asistente/paso-5-revisar.tsx`, tarea
 * T5.2). Muestra el resumen completo del `ModeloLineal` ya ensamblado
 * (`construirModeloDesdeAsistente`, `estado.ts`) y las 3 acciones de docs/06-ux-ui.md
 * §3.2: "Resolver modelo" (primaria), "Corregir…" (`DropdownMenu` con las 5 secciones
 * del CLI) y "Cancelar" (diálogo de confirmación).
 *
 * El resumen usa el formato LITERAL del CLI ("Variables de decisión:", "Función
 * objetivo:", "Restricciones:", "Condiciones:") vía `formatearResumenTexto` — excepción
 * ya autorizada a la regla de "sin jerga técnica" (AGENTS.md regla de oro #5): es una
 * pantalla de confirmación técnica, no una pregunta al usuario (decisión #1 del prompt
 * de la tarea). No se reescribe a mano, se usa tal cual el dominio lo genera.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { formatearResumenTexto } from "@/dominio/modelo/formato";
import { serializarModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import {
  BOTON_CANCELAR,
  BOTON_CONFIRMAR_CANCELAR,
  BOTON_CORREGIR,
  BOTON_RESOLVER_MODELO,
  BOTON_VOLVER_DIALOGO,
  DESCRIPCION_DIALOGO_CANCELAR,
  OPCION_CORREGIR_LIMITACIONES,
  OPCION_CORREGIR_NATURALEZA,
  OPCION_CORREGIR_OBJETIVO,
  OPCION_CORREGIR_OPCIONES,
  OPCION_CORREGIR_TODO,
  TITULO_DIALOGO_CANCELAR,
} from "./textos";

/**
 * Ruta de `/resolver` para "Resolver modelo" (docs/06-ux-ui.md §2:
 * "al generar → `/resolver?m=…&vista=modelo`"). Función pura, separada de
 * `manejarResolverModelo`, para poder probarla sin renderizar el componente.
 */
export function construirUrlResolver(modelo: ModeloLineal): string {
  return `/resolver?m=${serializarModelo(modelo)}&vista=modelo`;
}

export interface Paso5RevisarProps {
  modelo: ModeloLineal;
  /** Corregir "las opciones" (sección `'variables'` del CLI) — borra pasos 2 y 3. */
  onCorregirOpciones: () => void;
  onCorregirObjetivo: () => void;
  onCorregirLimitaciones: () => void;
  onCorregirNaturaleza: () => void;
  /** "Todo desde el inicio" — 5ta sección del mismo menú, reinicia el wizard completo. */
  onCorregirTodo: () => void;
  /** Se llama ya confirmado el diálogo de "Cancelar". */
  onCancelarConfirmado: () => void;
}

export function Paso5Revisar({
  modelo,
  onCorregirOpciones,
  onCorregirObjetivo,
  onCorregirLimitaciones,
  onCorregirNaturaleza,
  onCorregirTodo,
  onCancelarConfirmado,
}: Paso5RevisarProps) {
  const router = useRouter();
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  function manejarResolverModelo(): void {
    router.push(construirUrlResolver(modelo));
  }

  function manejarCancelarConfirmado(): void {
    setDialogoAbierto(false);
    onCancelarConfirmado();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <pre className="overflow-x-auto whitespace-pre-wrap text-sm" aria-label="Resumen del modelo">
            {formatearResumenTexto(modelo)}
          </pre>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
          <DialogTrigger render={<Button type="button" variant="outline">{BOTON_CANCELAR}</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{TITULO_DIALOGO_CANCELAR}</DialogTitle>
              <DialogDescription>{DESCRIPCION_DIALOGO_CANCELAR}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>{BOTON_VOLVER_DIALOGO}</DialogClose>
              <Button type="button" variant="destructive" onClick={manejarCancelarConfirmado}>
                {BOTON_CONFIRMAR_CANCELAR}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline">{BOTON_CORREGIR}</Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCorregirOpciones}>{OPCION_CORREGIR_OPCIONES}</DropdownMenuItem>
            <DropdownMenuItem onClick={onCorregirObjetivo}>{OPCION_CORREGIR_OBJETIVO}</DropdownMenuItem>
            <DropdownMenuItem onClick={onCorregirLimitaciones}>{OPCION_CORREGIR_LIMITACIONES}</DropdownMenuItem>
            <DropdownMenuItem onClick={onCorregirNaturaleza}>{OPCION_CORREGIR_NATURALEZA}</DropdownMenuItem>
            <DropdownMenuItem onClick={onCorregirTodo}>{OPCION_CORREGIR_TODO}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="button" onClick={manejarResolverModelo}>
          {BOTON_RESOLVER_MODELO}
        </Button>
      </div>
    </div>
  );
}
