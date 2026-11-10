"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { History, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelHistorial } from "@/features/historial/panel-historial";

interface OpcionTema {
  valor: "light" | "dark" | "system";
  etiqueta: string;
  Icono: LucideIcon;
}

const OPCIONES_TEMA: OpcionTema[] = [
  { valor: "light", etiqueta: "Claro", Icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Según el sistema", Icono: Monitor },
];

/**
 * Encabezado global de la app: nombre (enlace a Inicio), botón de historial (abre
 * `<PanelHistorial>` en un `Sheet`, docs/06-ux-ui.md §2) y el selector de tema claro/oscuro/sistema.
 */
export function Encabezado() {
  const { theme, setTheme } = useTheme();
  const [historialAbierto, setHistorialAbierto] = useState(false);

  return (
    <header className="border-b border-border print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md text-base font-bold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Programación lineal
        </Link>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 px-3"
                  onClick={() => setHistorialAbierto(true)}
                >
                  <History />
                  Historial
                </Button>
              }
            />
            <TooltipContent>Mirá los modelos que resolviste antes</TooltipContent>
          </Tooltip>
          <PanelHistorial open={historialAbierto} onOpenChange={setHistorialAbierto} />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Cambiar el tema de color"
                >
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:inline" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {OPCIONES_TEMA.map(({ valor, etiqueta, Icono }) => (
                <DropdownMenuItem
                  key={valor}
                  onClick={() => setTheme(valor)}
                  aria-current={theme === valor ? "true" : undefined}
                >
                  <Icono />
                  {etiqueta}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
