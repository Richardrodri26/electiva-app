/**
 * Banner "Tiene un modelo sin terminar" (`components/comunes/banner-borrador-sin-terminar.tsx`)
 * — docs/06-ux-ui.md §3.2: "El borrador persiste en `localStorage`; al volver: banner [...]
 * con [Retomar el modelo] [Descartar]". Lo comparten el asistente y el editor técnico.
 *
 * Componente de presentación puro: no lee `localStorage` él mismo (eso lo decide cada
 * pantalla, que sabe si hay un borrador para ofrecer); acá solo se muestran las dos acciones.
 * El título usa "usted" (docs/06 lo cita en tono "tú"; T5.1 fijó "usted" para toda la app).
 */

"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export const TITULO_BANNER_BORRADOR = "Tiene un modelo sin terminar";
export const BOTON_CONTINUAR_BORRADOR = "Retomar el modelo";
export const BOTON_DESCARTAR_BORRADOR = "Descartar";

export interface BannerBorradorSinTerminarProps {
  onContinuar: () => void;
  onDescartar: () => void;
  className?: string;
}

export function BannerBorradorSinTerminar({ onContinuar, onDescartar, className }: BannerBorradorSinTerminarProps) {
  return (
    <Alert className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <AlertTitle>{TITULO_BANNER_BORRADOR}</AlertTitle>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onContinuar}>
          {BOTON_CONTINUAR_BORRADOR}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDescartar}>
          {BOTON_DESCARTAR_BORRADOR}
        </Button>
      </div>
    </Alert>
  );
}
