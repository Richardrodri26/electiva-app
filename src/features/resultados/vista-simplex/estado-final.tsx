/**
 * Estado final de la pestaña Simplex (`features/resultados/vista-simplex/estado-final.tsx`),
 * docs/06-ux-ui.md §4 ("Estados y mensajes"): badge + alerta con el estado, y el botón
 * "Ver solución alternativa" cuando `estado === 'optimos_alternativos'`.
 *
 * Los 5 textos de alerta son los literales de docs/06 §4 (con los nombres/valores del
 * modelo actual interpolados); `limite_iteraciones` reusa el aviso `posible_ciclo` que ya
 * calcula `dominio/simplex/resolver.ts` (mismo texto, una sola fuente de verdad).
 */

"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "cn";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Expresion } from "@/components/comunes/expresion";
import { Fraccion } from "@/dominio/aritmetica/fraccion";
import { formatearValorNumerico, type FormatoNumero, type TokenExpresion } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import type { EstadoSimplex, ResultadoSimplex, Solucion } from "@/dominio/simplex/tipos";

import { unirConY } from "./utils-texto";

const ETIQUETA_ESTADO: Record<EstadoSimplex, string> = {
  optimo: "Óptimo",
  optimos_alternativos: "Óptimos alternativos",
  no_acotado: "No acotado",
  infactible: "Infactible",
  limite_iteraciones: "Límite de iteraciones",
};

function tokensSolucion(modelo: ModeloLineal, solucion: Solucion, formato: FormatoNumero): TokenExpresion[] {
  const tokens: TokenExpresion[] = [];
  modelo.variables.forEach((variable, indice) => {
    if (indice > 0) {
      tokens.push({ tipo: "op", texto: indice === modelo.variables.length - 1 ? " y " : ", " });
    }
    tokens.push({ tipo: "var", texto: variable.nombre });
    tokens.push({ tipo: "op", texto: " = " });
    const valor = solucion.valores[variable.nombre] ?? Fraccion.CERO;
    tokens.push({ tipo: "num", texto: formatearValorNumerico(valor, formato) });
  });
  return tokens;
}

/** Restricciones (docs/06 §4, "infactible") cuya artificial quedó básica con valor > 0 en la tabla final. */
function nombresRestriccionesInfactibles(modelo: ModeloLineal, resultado: ResultadoSimplex): string[] {
  const tablaFinal = resultado.tablas[resultado.tablas.length - 1];
  if (tablaFinal === undefined) return [];

  const numerosConArtificialPositiva = new Set<number>();
  tablaFinal.base.forEach((nombreBasica, indiceFila) => {
    const columna = resultado.columnas.find((c) => c.id === nombreBasica);
    if (
      columna?.tipo === "artificial" &&
      columna.restriccion !== undefined &&
      tablaFinal.ladoDerecho[indiceFila]!.esPositiva()
    ) {
      numerosConArtificialPositiva.add(columna.restriccion);
    }
  });

  return modelo.restricciones
    .filter((r) => numerosConArtificialPositiva.has(r.numero))
    .map((r) => r.nombre);
}

export interface EstadoFinalProps {
  modelo: ModeloLineal;
  resultado: ResultadoSimplex;
  formato: FormatoNumero;
  /** `true` cuando el stepper está mostrando la tabla extra de la solución alternativa. */
  mostrandoAlternativa: boolean;
  onVerAlternativa: () => void;
}

export function EstadoFinal({ modelo, resultado, formato, mostrandoAlternativa, onVerAlternativa }: EstadoFinalProps) {
  if (mostrandoAlternativa) {
    if (resultado.solucionAlternativa === undefined) return null;
    return (
      <Alert className="border-primary/40 text-primary">
        <AlertTitle>Solución alternativa</AlertTitle>
        <AlertDescription className="text-foreground">
          Z = {formatearValorNumerico(resultado.solucionAlternativa.z, formato)} con{" "}
          <Expresion tokens={tokensSolucion(modelo, resultado.solucionAlternativa, formato)} />.
        </AlertDescription>
      </Alert>
    );
  }

  const { estado } = resultado;

  return (
    <div className="flex flex-col gap-2">
      <Badge
        variant={estado === "infactible" || estado === "limite_iteraciones" ? "destructive" : "default"}
        className={cn(
          estado === "optimo" && "bg-entra text-background",
          estado === "optimos_alternativos" && "bg-primary text-primary-foreground",
          estado === "no_acotado" && "bg-amber-500 text-black",
        )}
      >
        {ETIQUETA_ESTADO[estado]}
      </Badge>

      {estado === "optimo" && resultado.solucion !== undefined ? (
        <Alert className="border-entra/40">
          <AlertTitle className="text-entra">Solución óptima</AlertTitle>
          <AlertDescription className="text-foreground">
            Z = {formatearValorNumerico(resultado.solucion.z, formato)} con{" "}
            <Expresion tokens={tokensSolucion(modelo, resultado.solucion, formato)} />.
          </AlertDescription>
        </Alert>
      ) : null}

      {estado === "optimos_alternativos" && resultado.solucion !== undefined ? (
        <Alert className="border-primary/40">
          <AlertTitle className="text-primary">Hay más de una solución óptima</AlertTitle>
          <AlertDescription className="text-foreground">
            Z = {formatearValorNumerico(resultado.solucion.z, formato)}.{" "}
            {resultado.solucionAlternativa !== undefined ? (
              <Button variant="outline" size="sm" className="mt-2" onClick={onVerAlternativa}>
                Ver solución alternativa
                <ArrowRight aria-hidden="true" />
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {estado === "no_acotado" ? (
        <Alert className="border-amber-500/50">
          <AlertTitle className="text-amber-600 dark:text-amber-400">No acotado</AlertTitle>
          <AlertDescription className="text-foreground">
            Z puede crecer sin límite: falta alguna limitación. Revise sus restricciones.
          </AlertDescription>
        </Alert>
      ) : null}

      {estado === "infactible" ? (
        <Alert variant="destructive">
          <AlertTitle>Infactible</AlertTitle>
          <AlertDescription>
            Ningún punto cumple todas las restricciones a la vez.{" "}
            {(() => {
              const nombres = nombresRestriccionesInfactibles(modelo, resultado);
              return nombres.length > 0 ? `Revise los límites de ${unirConY(nombres)}.` : "Revise sus restricciones.";
            })()}
          </AlertDescription>
        </Alert>
      ) : null}

      {estado === "limite_iteraciones" ? (
        <Alert variant="destructive">
          <AlertTitle>Límite de iteraciones</AlertTitle>
          <AlertDescription>
            {resultado.avisos.find((a) => a.codigo === "posible_ciclo")?.mensaje ??
              "Se alcanzó el límite de iteraciones sin llegar a una solución; puede indicar que el método está ciclando."}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
