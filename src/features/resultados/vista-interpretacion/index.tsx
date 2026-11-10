/**
 * Pestaña "Interpretación" (`features/resultados/vista-interpretacion/index.tsx`) —
 * docs/07-plan-de-implementacion.md T6.5 y docs/06-ux-ui.md §3.4: frases de
 * `dominio/simplex/interpretar.ts` agrupadas en "Qué conviene hacer", "Cómo quedan tus
 * recursos" y "Resultado", más los avisos del motor (docs/04 §4.4) como `Alert`.
 */

"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { interpretarResultado, type InterpretacionResultado } from "@/dominio/simplex/interpretar";
import type { ResultadoSimplex } from "@/dominio/simplex/tipos";
import { useSolucionSimplex } from "../use-solucion-simplex";

export interface VistaInterpretacionProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaInterpretacion({ modelo, formato }: VistaInterpretacionProps) {
  const resultado = useSolucionSimplex(modelo);

  if (resultado.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (resultado.isError || resultado.data === undefined) {
    return (
      <EstadoVacio
        titulo="No se pudo calcular la interpretación"
        descripcion="Vuelva a cargar la página o revise el modelo en la pestaña Modelo."
      />
    );
  }

  const interpretacion = interpretarResultado(modelo, resultado.data, formato);

  if (interpretacion === undefined) {
    return (
      <EstadoVacio
        titulo="No hay solución que interpretar"
        descripcion="Este modelo no tiene una solución final, así que no hay frases de interpretación. Revise la pestaña Simplex para ver por qué."
      />
    );
  }

  return <ContenidoInterpretacion interpretacion={interpretacion} resultado={resultado.data} />;
}

interface ContenidoInterpretacionProps {
  interpretacion: InterpretacionResultado;
  resultado: ResultadoSimplex;
}

function ContenidoInterpretacion({ interpretacion, resultado }: ContenidoInterpretacionProps) {
  return (
    <div className="flex flex-col gap-6">
      {resultado.avisos.length > 0 ? (
        <div className="flex flex-col gap-3">
          {resultado.avisos.map((aviso) => (
            <Alert key={aviso.codigo}>
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Aviso</AlertTitle>
              <AlertDescription>{aviso.mensaje}</AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      <Seccion titulo="Qué conviene hacer">
        <Frases frases={interpretacion.variables} />
      </Seccion>

      <Seccion titulo="Cómo quedan sus recursos">
        <Frases frases={interpretacion.restricciones} />
      </Seccion>

      <Seccion titulo="Resultado">
        <p className="text-base font-semibold text-foreground">{interpretacion.objetivo}</p>
      </Seccion>
    </div>
  );
}

interface SeccionProps {
  titulo: string;
  children: ReactNode;
}

function Seccion({ titulo, children }: SeccionProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

interface FrasesProps {
  frases: string[];
}

function Frases({ frases }: FrasesProps) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground">
      {frases.map((frase, indice) => (
        <li key={indice}>{frase}</li>
      ))}
    </ul>
  );
}
