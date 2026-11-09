/**
 * `<ResultadosLayout>` (`features/resultados/resultados-layout.tsx`) — T6.1 de
 * docs/07-plan-de-implementacion.md: layout y esqueleto de `/resolver` (docs/06-ux-ui.md §3.4).
 *
 * SOLO layout: encabezado de la pantalla (volver al editor, título, toggle fracción/decimal,
 * copiar enlace, menú "⋯"), pestañas sincronizadas con `?vista=` y columna lateral con el
 * modelo. El contenido de cada pestaña vive en su carpeta `vista-XXX/index.tsx` (placeholders por ahora,
 * tareas T6.2-T6.5) y nunca se implementa acá, para que esas tareas no necesiten tocar este
 * archivo compartido.
 */

"use client";

import Link from "next/link";
import { useQueryState } from "nuqs";
import { Copy, Link2, Printer, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Expresion } from "@/components/comunes/expresion";
import { generarTokensExpresion } from "@/dominio/modelo/formato";
import { serializarModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import {
  CLAVE_NUM,
  CLAVE_VISTA,
  FORMATO_NUMERO_DEFECTO,
  VISTA_DEFECTO,
  VISTAS,
  parseAsFormatoNumero,
  parseAsVista,
} from "@/lib/url-state";
import type { Vista } from "@/lib/url-state";
import { ColumnaModelo } from "./columna-modelo";
import { useSolucionSimplex } from "./use-solucion-simplex";
import { VistaGrafico } from "./vista-grafico";
import { VistaInterpretacion } from "./vista-interpretacion";
import { VistaModelo } from "./vista-modelo";
import { VistaSimplex } from "./vista-simplex";

/** docs/05-metodo-grafico.md §0: texto exacto del tooltip cuando la pestaña está deshabilitada. */
const TEXTO_GRAFICO_DESHABILITADO =
  "El método gráfico solo aplica a modelos con 2 variables. Usa el Simplex.";

export interface ResultadosLayoutProps {
  modelo: ModeloLineal;
}

export function ResultadosLayout({ modelo }: ResultadosLayoutProps) {
  const [vista, setVista] = useQueryState(CLAVE_VISTA, parseAsVista.withDefault(VISTA_DEFECTO));
  const [formato, setFormato] = useQueryState(
    CLAVE_NUM,
    parseAsFormatoNumero.withDefault(FORMATO_NUMERO_DEFECTO),
  );

  const resultadoSimplex = useSolucionSimplex(modelo);
  const graficoHabilitado = modelo.variables.length === 2;

  function manejarCambioVista(valor: unknown): void {
    if (typeof valor !== "string" || !esVista(valor)) {
      return;
    }
    if (valor === "grafico" && !graficoHabilitado) {
      return;
    }
    void setVista(valor);
  }

  // El wrapper local de `ToggleGroup` (components/ui/toggle-group.tsx) fija el tipo del
  // grupo a `string[]` (no propaga el genérico `Value` del primitivo de Base UI), así que
  // acá se valida en runtime contra `FORMATOS_NUMERO` en vez de confiar en el tipo.
  function manejarCambioFormato(valores: string[]): void {
    const siguiente = valores[0];
    if (siguiente === "fraccion" || siguiente === "decimal") {
      void setFormato(siguiente);
    }
  }

  async function copiarEnlace(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const tokensTitulo = generarTokensExpresion(modelo.objetivo.coeficientes, modelo.variables, formato);
  const hrefEditor = `/modelo/editor?m=${serializarModelo(modelo)}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={hrefEditor}>← Editar</Link>} />
          <p className="text-base font-semibold">
            <Expresion
              tokens={[
                { tipo: "op", texto: `${modelo.objetivo.sentido} ` },
                { tipo: "var", texto: modelo.objetivo.simbolo },
                { tipo: "op", texto: " = " },
                ...tokensTitulo,
              ]}
            />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            value={[formato]}
            onValueChange={manejarCambioFormato}
            aria-label="Formato de los números"
          >
            <ToggleGroupItem value="fraccion">Fracción</ToggleGroupItem>
            <ToggleGroupItem value="decimal">Decimal</ToggleGroupItem>
          </ToggleGroup>

          <Button variant="outline" size="sm" onClick={copiarEnlace}>
            <Link2 />
            Copiar enlace
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
                  ⋯
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {/* STUBS (T6.1): sin lógica real todavía — docs/06-ux-ui.md §3.4. Cada ítem se
                  implementa en su tarea correspondiente sin necesidad de tocar este layout. */}
              <DropdownMenuItem>
                <Copy />
                Copiar como texto
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer />
                Imprimir
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Save />
                Guardar con nombre
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <ColumnaModelo modelo={modelo} formato={formato} resultado={resultadoSimplex} />

        <div className="min-w-0 flex-1">
          <Tabs value={vista} onValueChange={manejarCambioVista}>
            <TabsList>
              <TabsTrigger value="modelo">Modelo</TabsTrigger>

              {graficoHabilitado ? (
                <TabsTrigger value="grafico">Método gráfico</TabsTrigger>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className="inline-flex">
                        <TabsTrigger value="grafico" aria-disabled="true">
                          Método gráfico
                        </TabsTrigger>
                      </span>
                    }
                  />
                  <TooltipContent>{TEXTO_GRAFICO_DESHABILITADO}</TooltipContent>
                </Tooltip>
              )}

              <TabsTrigger value="simplex">Simplex</TabsTrigger>
              <TabsTrigger value="interpretacion">Interpretación</TabsTrigger>
            </TabsList>

            <TabsContent value="modelo">
              <VistaModelo modelo={modelo} formato={formato} />
            </TabsContent>
            <TabsContent value="grafico">
              <VistaGrafico modelo={modelo} formato={formato} />
            </TabsContent>
            <TabsContent value="simplex">
              <VistaSimplex modelo={modelo} formato={formato} />
            </TabsContent>
            <TabsContent value="interpretacion">
              <VistaInterpretacion modelo={modelo} formato={formato} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function esVista(valor: string): valor is Vista {
  return (VISTAS as readonly string[]).includes(valor);
}
