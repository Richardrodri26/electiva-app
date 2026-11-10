/**
 * Pestaña "Modelo" (`features/resultados/vista-modelo/index.tsx`) — docs/07-plan-de-implementacion.md
 * T6.2: notación matemática completa del modelo + "Copiar como texto".
 *
 * Solo presentación: el formato (signos, coeficientes implícitos, fracción/decimal) lo arma el
 * dominio (`dominio/modelo/formato.ts`) y acá se renderiza con `<Expresion>`.
 */

"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Expresion } from "@/components/comunes/expresion";
import {
  formatearModeloTexto,
  generarTokensExpresion,
  generarTokensRestriccion,
  type FormatoNumero,
  type TokenExpresion,
} from "@/dominio/modelo/formato";
import type { ModeloLineal, Variable } from "@/dominio/modelo/tipos";

export interface VistaModeloProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaModelo({ modelo, formato }: VistaModeloProps) {
  const tokensObjetivo = generarTokensExpresion(modelo.objetivo.coeficientes, modelo.variables, formato);
  const etiquetaSentido = modelo.objetivo.sentido === "max" ? "Maximizar" : "Minimizar";

  async function copiarComoTexto(): Promise<void> {
    try {
      await navigator.clipboard.writeText(formatearModeloTexto(modelo, formato));
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar el texto");
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex justify-end print:hidden">
        <Button variant="outline" size="sm" onClick={copiarComoTexto}>
          <Copy />
          Copiar como texto
        </Button>
      </div>

      <section aria-labelledby="modelo-variables" className="flex flex-col gap-2">
        <h3 id="modelo-variables" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Variables de decisión
        </h3>
        <ul className="flex flex-col gap-1.5">
          {modelo.variables.map((variable) => (
            <li key={variable.nombre} className="text-sm">
              {modelo.origen === "asistente" ? (
                <DefinicionVariable variable={variable} />
              ) : (
                <Expresion tokens={[{ tipo: "var", texto: variable.nombre }]} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="modelo-objetivo" className="flex flex-col gap-2">
        <h3 id="modelo-objetivo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Función objetivo
        </h3>
        <p className="text-base">
          <span className="font-semibold">{etiquetaSentido} </span>
          <Expresion
            tokens={[
              { tipo: "var", texto: modelo.objetivo.simbolo },
              { tipo: "op", texto: " = " },
              ...tokensObjetivo,
            ]}
          />
        </p>
      </section>

      <section aria-labelledby="modelo-restricciones" className="flex flex-col gap-2">
        <h3 id="modelo-restricciones" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Restricciones
        </h3>
        <ul className="flex flex-col gap-3">
          {modelo.restricciones.map((restriccion) => (
            <li key={restriccion.numero} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {restriccion.numero}. {restriccion.nombre}
              </span>
              <span className="text-sm sm:text-base">
                <Expresion
                  tokens={generarTokensRestriccion(
                    restriccion.coeficientes,
                    modelo.variables,
                    restriccion.relacion,
                    restriccion.limite,
                    formato,
                  )}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="modelo-condiciones" className="flex flex-col gap-2">
        <h3 id="modelo-condiciones" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Condiciones
        </h3>
        <p className="text-sm">
          <Expresion tokens={tokensCondiciones(modelo)} />
        </p>
      </section>
    </div>
  );
}

/**
 * Variable del asistente: su definición en lenguaje cotidiano (p. ej. "x1 = cantidad de Mesas…").
 * Si la definición empieza con el nombre de la variable, ese nombre se renderiza con subíndice.
 */
function DefinicionVariable({ variable }: { variable: Variable }) {
  if (!variable.definicion.startsWith(variable.nombre)) {
    return <span>{variable.definicion}</span>;
  }
  return (
    <Expresion
      tokens={[
        { tipo: "var", texto: variable.nombre },
        { tipo: "op", texto: variable.definicion.slice(variable.nombre.length) },
      ]}
    />
  );
}

/** Condiciones de no negatividad o enteridad, en notación (≥ en vez de `>=` del texto plano). */
function tokensCondiciones(modelo: ModeloLineal): TokenExpresion[] {
  const tokens: TokenExpresion[] = [];
  modelo.variables.forEach((variable, indice) => {
    if (indice > 0) {
      tokens.push({ tipo: "op", texto: ", " });
    }
    tokens.push({ tipo: "var", texto: variable.nombre });
  });
  if (modelo.naturaleza === "entera") {
    tokens.push({ tipo: "op", texto: " son números enteros no negativos" });
  } else {
    tokens.push({ tipo: "op", texto: " ≥ 0" });
  }
  return tokens;
}
