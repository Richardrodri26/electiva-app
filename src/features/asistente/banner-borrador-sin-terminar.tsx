/**
 * Banner "Tiene un modelo sin terminar" (`features/asistente/banner-borrador-sin-terminar.tsx`,
 * tarea T5.2) — docs/06-ux-ui.md §3.2: "El borrador persiste en `localStorage`; al
 * volver: banner [...] con [Continuar] [Descartar]".
 *
 * Componente de presentación puro: no lee `localStorage` él mismo (eso lo hace
 * `<Asistente>`, que decide si hay un borrador para ofrecer); acá solo se muestran las
 * dos acciones.
 */

"use client";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

import { BOTON_CONTINUAR_BORRADOR, BOTON_DESCARTAR_BORRADOR, TITULO_BANNER_BORRADOR } from "./textos";

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
