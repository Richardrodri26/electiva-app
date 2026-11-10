/**
 * Pestaña "Simplex" (`features/resultados/vista-simplex/index.tsx`) — docs/07-plan-de-implementacion.md
 * T6.3: preparación plegable, stepper con `?iter=`, tabla con TanStack Table, resaltado y
 * animación del resaltador, explicación, estados finales, alternativa.
 *
 * Reemplaza el placeholder de T6.1. Pide su propio `resultado` con `useSolucionSimplex`
 * (el layout compartido, `resultados-layout.tsx`, solo le pasa `modelo`/`formato` — no se
 * toca ese archivo en esta tarea).
 *
 * La "solución alternativa" (cuando existe) se muestra como UNA TABLA MÁS al final del
 * stepper (decisión ya confirmada, no un panel separado): `total = tablas.length + 1` y la
 * última posición (`iter === tablas.length`) renderiza `resultado.alternativa.tabla`.
 */

"use client";

import type { KeyboardEvent } from "react";
import { useQueryState } from "nuqs";

import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { Skeleton } from "@/components/ui/skeleton";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { CLAVE_ITER, parseAsIter } from "@/lib/url-state";

import { useSolucionSimplex } from "../use-solucion-simplex";
import { EstadoFinal } from "./estado-final";
import { construirExplicacionAlternativa, construirExplicacionDecision } from "./explicacion";
import { Preparacion } from "./preparacion";
import { Stepper } from "./stepper";
import { TablaSimplexView } from "./tabla-simplex";

export interface VistaSimplexProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaSimplex({ modelo, formato }: VistaSimplexProps) {
  const resultadoQuery = useSolucionSimplex(modelo);
  const [iter, setIter] = useQueryState(CLAVE_ITER, parseAsIter.withDefault(0));

  if (resultadoQuery.isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Resolviendo el modelo">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (resultadoQuery.isError || resultadoQuery.data === undefined) {
    return (
      <EstadoVacio
        titulo="No se pudo resolver el modelo"
        descripcion="Revisá el modelo en el editor; si el problema persiste, puede ser un error de la aplicación."
      />
    );
  }

  const resultado = resultadoQuery.data;
  const totalPrincipales = resultado.tablas.length;
  const hayAlternativa = resultado.alternativa !== undefined;
  const total = totalPrincipales + (hayAlternativa ? 1 : 0);

  // `?iter=` puede llegar fuera de rango (URL vieja o escrita a mano): se recorta, no se rompe.
  const iterActual = Math.min(Math.max(iter, 0), total - 1);

  function irA(siguiente: number): void {
    const recortado = Math.min(Math.max(siguiente, 0), total - 1);
    void setIter(recortado === 0 ? null : recortado);
  }

  function manejarTeclado(evento: KeyboardEvent<HTMLDivElement>): void {
    if (evento.key === "ArrowLeft") {
      evento.preventDefault();
      irA(iterActual - 1);
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      irA(iterActual + 1);
    }
  }

  const esAlternativa = hayAlternativa && iterActual === totalPrincipales;
  const tablaActual = esAlternativa ? resultado.alternativa!.tabla : resultado.tablas[iterActual]!;
  const esUltimaTablaPrincipal = !esAlternativa && iterActual === totalPrincipales - 1;

  const explicacion = esAlternativa
    ? construirExplicacionAlternativa(resultado.alternativa!.decision, formato)
    : construirExplicacionDecision(tablaActual, modelo.objetivo.sentido, formato);

  return (
    <div className="flex flex-col gap-4">
      <Preparacion
        pasos={resultado.preparacion}
        nombresVariables={modelo.variables.map((v) => v.nombre)}
        formato={formato}
      />

      {/* Área navegable con ← / → (docs/06-ux-ui.md §3.4 "Atajos"): el `onKeyDown` recibe el evento
          de cualquier control interno con foco (stepper, encabezados con tooltip, botones). */}
      <div
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4"
        onKeyDown={manejarTeclado}
        role="group"
        aria-label="Tablas del Simplex, navegables con las flechas del teclado"
      >
        <Stepper
          iter={iterActual}
          total={total}
          onCambiarIter={irA}
          finalResuelto={resultado.estado === "optimo" || resultado.estado === "optimos_alternativos"}
        />

        <div aria-live="polite">
          <TablaSimplexView
            key={`${tablaActual.indice}-${esAlternativa ? "alt" : "principal"}`}
            tabla={tablaActual}
            columnas={resultado.columnas}
            formato={formato}
            posicion={iterActual + 1}
            total={total}
            etiquetaExtra={esAlternativa ? "Solución alternativa" : undefined}
          />
        </div>

        {explicacion !== null ? <p className="text-sm text-muted-foreground">{explicacion}</p> : null}

        {esUltimaTablaPrincipal || esAlternativa ? (
          <EstadoFinal
            modelo={modelo}
            resultado={resultado}
            formato={formato}
            mostrandoAlternativa={esAlternativa}
            onVerAlternativa={() => irA(totalPrincipales)}
          />
        ) : null}
      </div>
    </div>
  );
}
