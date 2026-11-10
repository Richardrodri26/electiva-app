/**
 * `<PanelHistorial>` (`features/historial/panel-historial.tsx`) — tarea T7.1,
 * docs/06-ux-ui.md §2 ("el historial se abre en un `Sheet` desde el encabezado global") y
 * §3.4 ("Historial · abrir, renombrar, eliminar").
 *
 * Dueño del `Sheet` completo (Root + Content): el encabezado global (`components/encabezado.tsx`)
 * solo controla si está abierto o no (`open`/`onOpenChange`), igual que cualquier otro estado de
 * UI — no sabe nada de `localStorage` ni de TanStack Query.
 *
 * Lista más reciente primero (ya es el orden que devuelve `useHistorial`). Por entrada:
 * - Abrir: link a `/resolver?m=…` (cierra el panel al navegar).
 * - Renombrar: edición inline (reemplaza el título por un `Input` + Guardar/Cancelar) — más
 *   liviano que un diálogo aparte para un solo campo de texto.
 * - Eliminar: diálogo de confirmación (un solo `Dialog` controlado por la entrada pendiente,
 *   no uno por fila), mismo patrón que la confirmación de "Cancelar" del asistente
 *   (`features/asistente/paso-5-revisar.tsx`).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EstadoVacio } from "@/components/comunes/estado-vacio";

import { serializarModelo } from "@/dominio/modelo/serializacion";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";

import { useEliminarEntradaHistorial, useHistorial, useRenombrarEntradaHistorial } from "./use-historial";
import type { EntradaHistorial } from "./tipos";

/** Mismo texto corto que `features/resultados/columna-modelo.tsx` (docs/06 §4). */
const ETIQUETA_ESTADO: Record<EstadoSimplex, string> = {
  optimo: "Óptimo",
  optimos_alternativos: "Óptimos alternativos",
  no_acotado: "No acotado",
  infactible: "Infactible",
  limite_iteraciones: "Límite de iteraciones",
};

const VARIANTE_BADGE_ESTADO: Record<EstadoSimplex, "default" | "secondary" | "destructive"> = {
  optimo: "default",
  optimos_alternativos: "default",
  no_acotado: "secondary",
  infactible: "destructive",
  limite_iteraciones: "destructive",
};

function formatearFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export interface PanelHistorialProps {
  open: boolean;
  onOpenChange: (valor: boolean) => void;
}

export function PanelHistorial({ open, onOpenChange }: PanelHistorialProps) {
  const historial = useHistorial();
  const [entradaAEliminar, setEntradaAEliminar] = useState<EntradaHistorial | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Historial</SheetTitle>
          <SheetDescription>Los últimos modelos que resolviste, más reciente primero.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {historial.isPending ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : null}
          {historial.data !== undefined && historial.data.length === 0 ? (
            <EstadoVacio titulo="Todavía no resolviste ningún modelo" />
          ) : null}
          {historial.data?.map((entrada) => (
            <ItemHistorial
              key={entrada.hash}
              entrada={entrada}
              onCerrarPanel={() => onOpenChange(false)}
              onPedirEliminar={() => setEntradaAEliminar(entrada)}
            />
          ))}
        </div>
      </SheetContent>

      <Dialog open={entradaAEliminar !== null} onOpenChange={(valor) => !valor && setEntradaAEliminar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar del historial</DialogTitle>
            <DialogDescription>
              {entradaAEliminar !== null
                ? `Se va a eliminar "${entradaAEliminar.titulo}" del historial. Esta acción no se puede deshacer.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <BotonConfirmarEliminar
              entrada={entradaAEliminar}
              onListo={() => setEntradaAEliminar(null)}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

function BotonConfirmarEliminar({
  entrada,
  onListo,
}: {
  entrada: EntradaHistorial | null;
  onListo: () => void;
}) {
  const eliminar = useEliminarEntradaHistorial();

  function manejarClick(): void {
    if (entrada === null) {
      return;
    }
    eliminar.mutate(entrada.hash, {
      onSuccess: () => {
        toast.success("Eliminado del historial");
        onListo();
      },
      onError: () => {
        toast.error("No se pudo eliminar");
      },
    });
  }

  return (
    <Button type="button" variant="destructive" onClick={manejarClick} disabled={eliminar.isPending}>
      Eliminar
    </Button>
  );
}

interface ItemHistorialProps {
  entrada: EntradaHistorial;
  onCerrarPanel: () => void;
  onPedirEliminar: () => void;
}

function ItemHistorial({ entrada, onCerrarPanel, onPedirEliminar }: ItemHistorialProps) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(entrada.titulo);
  const renombrar = useRenombrarEntradaHistorial();

  function empezarEdicion(): void {
    setTitulo(entrada.titulo);
    setEditando(true);
  }

  function confirmarRenombre(): void {
    const siguiente = titulo.trim();
    if (siguiente.length === 0 || siguiente === entrada.titulo) {
      setEditando(false);
      return;
    }
    renombrar.mutate(
      { hash: entrada.hash, titulo: siguiente },
      {
        onSuccess: () => {
          setEditando(false);
        },
        onError: () => {
          toast.error("No se pudo renombrar");
        },
      },
    );
  }

  const href = `/resolver?m=${serializarModelo(entrada.modelo)}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {editando ? (
        <div className="flex items-center gap-1">
          <Input
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
            aria-label="Nuevo nombre"
            maxLength={120}
            autoFocus
            onKeyDown={(evento) => {
              if (evento.key === "Enter") {
                confirmarRenombre();
              }
              if (evento.key === "Escape") {
                setEditando(false);
              }
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Guardar nombre"
            onClick={confirmarRenombre}
            disabled={renombrar.isPending}
          >
            <Check />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancelar edición del nombre"
            onClick={() => setEditando(false)}
          >
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            onClick={onCerrarPanel}
            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline focus-visible:underline"
          >
            {entrada.titulo}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Renombrar "${entrada.titulo}"`}
              onClick={empezarEdicion}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Eliminar "${entrada.titulo}"`}
              onClick={onPedirEliminar}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={VARIANTE_BADGE_ESTADO[entrada.estado]}>{ETIQUETA_ESTADO[entrada.estado]}</Badge>
        <span>{formatearFecha(entrada.fecha)}</span>
      </div>
    </div>
  );
}
