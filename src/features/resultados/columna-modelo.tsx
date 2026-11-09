/**
 * `<ColumnaModelo>` (`features/resultados/columna-modelo.tsx`) — docs/06-ux-ui.md §3.4.
 *
 * Columna lateral de `/resolver`: modelo compacto + estado + Z, "siempre visible" en
 * pantallas ≥1024px (acá, sticky) y "un resumen plegable arriba" en móvil. En vez de pelear
 * con la visibilidad interna de `<Collapsible>` a distintos breakpoints, se renderiza el
 * mismo contenido (`ContenidoModelo`) dos veces: una versión sticky visible solo en
 * `lg:` (`<aside>` con `hidden lg:block`) y una versión plegable visible solo debajo de
 * `lg:` (envuelta en `<Collapsible>`, con `lg:hidden` en el contenedor) — evita que las
 * utilidades responsive de Tailwind compitan con el estado abierto/cerrado que maneja
 * Base UI internamente.
 */

"use client";

import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Expresion } from "@/components/comunes/expresion";
import {
  formatearValorNumerico,
  generarTokensExpresion,
  generarTokensRestriccion,
  type FormatoNumero,
} from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import type { EstadoSimplex } from "@/dominio/simplex/tipos";
import type { useSolucionSimplex } from "./use-solucion-simplex";

/** Etiquetas cortas del estado para la columna lateral (docs/06 §4 trae la frase completa; acá va solo el badge). */
const ETIQUETA_ESTADO_SIMPLEX: Record<EstadoSimplex, string> = {
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

export interface ColumnaModeloProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
  resultado: ReturnType<typeof useSolucionSimplex>;
}

export function ColumnaModelo({ modelo, formato, resultado }: ColumnaModeloProps) {
  return (
    <>
      {/* Escritorio (≥1024px): siempre visible, sticky (docs/06 §3.4). */}
      <aside aria-label="Modelo" className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="lg:sticky lg:top-20">
          <ContenidoModelo modelo={modelo} formato={formato} resultado={resultado} />
        </div>
      </aside>

      {/* Móvil (<1024px): resumen plegable (docs/06 §3.4). */}
      <div className="lg:hidden">
        <Collapsible defaultOpen={false}>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Modelo</CardTitle>
              <CollapsibleTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Mostrar u ocultar el resumen del modelo">
                    <ChevronDown />
                  </Button>
                }
              />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="flex flex-col gap-3 pt-0">
                <CuerpoModelo modelo={modelo} formato={formato} resultado={resultado} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </>
  );
}

function ContenidoModelo({ modelo, formato, resultado }: ColumnaModeloProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-muted-foreground">Modelo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <CuerpoModelo modelo={modelo} formato={formato} resultado={resultado} />
      </CardContent>
    </Card>
  );
}

function CuerpoModelo({ modelo, formato, resultado }: ColumnaModeloProps) {
  const tokensObjetivo = generarTokensExpresion(modelo.objetivo.coeficientes, modelo.variables, formato);

  return (
    <>
      <p className="text-sm">
        <span className="font-semibold">{modelo.objetivo.sentido === "max" ? "Maximizar" : "Minimizar"} </span>
        <Expresion
          tokens={[
            { tipo: "var", texto: modelo.objetivo.simbolo },
            { tipo: "op", texto: " = " },
            ...tokensObjetivo,
          ]}
        />
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-muted-foreground">s.a.</p>
        <ul className="flex flex-col gap-1">
          {modelo.restricciones.map((restriccion) => (
            <li key={restriccion.numero} className="text-sm">
              <Expresion
                tokens={generarTokensRestriccion(
                  restriccion.coeficientes,
                  modelo.variables,
                  restriccion.relacion,
                  restriccion.limite,
                  formato,
                )}
              />
            </li>
          ))}
        </ul>
      </div>
      <EstadoYZ resultado={resultado} formato={formato} />
    </>
  );
}

function EstadoYZ({
  resultado,
  formato,
}: {
  resultado: ReturnType<typeof useSolucionSimplex>;
  formato: FormatoNumero;
}) {
  if (resultado.isPending) {
    return <Skeleton className="h-6 w-24" />;
  }
  if (resultado.isError || resultado.data === undefined) {
    return null;
  }

  const { estado, solucion } = resultado.data;

  return (
    <div className="flex items-center gap-2 border-t border-border pt-3">
      <Badge variant={VARIANTE_BADGE_ESTADO[estado]}>{ETIQUETA_ESTADO_SIMPLEX[estado]}</Badge>
      {solucion !== undefined ? (
        <span className="text-sm font-semibold">
          Z = {formatearValorNumerico(solucion.z, formato)}
        </span>
      ) : null}
    </div>
  );
}
