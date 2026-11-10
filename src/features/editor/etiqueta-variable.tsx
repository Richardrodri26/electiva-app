/**
 * `<EtiquetaVariable>` (`features/editor/etiqueta-variable.tsx`) — docs/06-ux-ui.md §3.3:
 * "Columna de variable: encabezado editable (etiqueta) en un `Popover`."
 *
 * Encabezado de columna de la grilla: muestra la etiqueta actual (ej. "Mesas", o "x2" si
 * todavía no se renombró) y, al abrir el `Popover`, un campo para editarla. Solo expone la
 * etiqueta (no la definición completa, que no aparece en ningún lado de la pantalla del
 * editor según el mockup de docs/06 §3.3): la definición se queda con su valor por defecto
 * (`definicionVariablePorDefecto`, `estado.ts`), que siempre es válido.
 *
 * El mockup de docs/06 §3.3 no dibuja un botón para QUITAR una variable (las limitaciones
 * del ASCII art no alcanzan para mostrarlo), pero el punto 2 de la tarea T4.2 exige poder
 * quitar variables conservando el resto de los datos (`estado.ts: quitarVariable`), así que
 * necesita algún lugar en la UI. Se decidió ponerlo dentro de este mismo `Popover` (ya es el
 * lugar dedicado a "acciones sobre esta variable") en vez de un ícono aparte en el
 * encabezado, que quedaría muy apretado con 6 variables — decisión de bajo riesgo, reportada
 * en el resumen de la tarea.
 */

"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface EtiquetaVariableProps {
  /** Índice 0-based de la variable (para el id del campo y el texto "x{n}"). */
  indice: number;
  etiqueta: string;
  error?: string;
  onCambiarEtiqueta: (valor: string) => void;
  onBlur?: () => void;
  /** `false` si ya se llegó al mínimo de variables (el botón de quitar se deshabilita). */
  puedeQuitar: boolean;
  onQuitar: () => void;
}

export function EtiquetaVariable({
  indice,
  etiqueta,
  error,
  onCambiarEtiqueta,
  onBlur,
  puedeQuitar,
  onQuitar,
}: EtiquetaVariableProps) {
  const [abierto, setAbierto] = useState(false);
  const idCampo = `etiqueta-variable-${indice}`;
  const numero = indice + 1;

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-1.5 py-1 font-serif italic hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Editar el nombre de x${numero} (actualmente "${etiqueta || `x${numero}`}")`}
          >
            <span className="truncate">{etiqueta || `x${numero}`}</span>
            <Pencil className="size-3 shrink-0 opacity-60" aria-hidden="true" />
          </button>
        }
      />
      <PopoverContent className="w-56">
        <Field>
          <FieldLabel htmlFor={idCampo}>{`Nombre de x${numero}`}</FieldLabel>
          <Input
            id={idCampo}
            value={etiqueta}
            onChange={(evento) => onCambiarEtiqueta(evento.target.value)}
            onBlur={onBlur}
            aria-invalid={error !== undefined}
            aria-describedby={error !== undefined ? `${idCampo}-error` : undefined}
            autoFocus
          />
          <FieldError id={`${idCampo}-error`} errors={error !== undefined ? [{ message: error }] : undefined} />
        </Field>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!puedeQuitar}
          onClick={() => {
            setAbierto(false);
            onQuitar();
          }}
        >
          <Trash2 /> Quitar esta variable
        </Button>
      </PopoverContent>
    </Popover>
  );
}
