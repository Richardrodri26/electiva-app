/**
 * Sección "Preparación" de la pestaña Simplex (`features/resultados/vista-simplex/preparacion.tsx`),
 * docs/06-ux-ui.md §3.4: "Preparación ▸ (plegable) 1 Normalizar · 2 Forma estándar ·
 * 3 Forma canónica · 4 Ajuste de M".
 *
 * `resultado.preparacion` (docs/04-motor-simplex.md §2) es una lista plana de 5 tipos de
 * paso; se agrupan en los 4 numerados del mockup así (decisión de esta tarea, ver resumen
 * final sobre esta ambigüedad):
 * 1. Normalizar  ← pasos `normalizar_limite` (§2.1, cero o más).
 * 2. Forma estándar ← pasos `agregar_variables` (§2.2/§2.3, uno por restricción) + el paso
 *    `forma_estandar` (§2.2, diapositiva 8: el sistema completo con TODAS las columnas,
 *    0 explícito donde no aparecen — por eso se muestra como grilla, no como ecuación
 *    abreviada: es justamente el punto de la diapositiva 8 mostrar los ceros).
 * 3. Forma canónica ← el paso `fila_z_canonica` (§2.4).
 * 4. Ajuste de M ← el paso `ajuste_m` (§2.5): fila Z antes/después + operaciones.
 */

"use client";

import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Expresion } from "@/components/comunes/expresion";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ColumnaTabla, PasoPreparacion } from "@/dominio/simplex/tipos";

import { GrillaPreparacion } from "./grilla-preparacion";
import { describirOperacion } from "./operaciones";
import { tokensRestriccionFraccion } from "./tokens-fraccion";

const ETIQUETA_TIPO: Record<ColumnaTabla["tipo"], string> = {
  decision: "variable de decisión",
  holgura: "holgura",
  exceso: "exceso",
  artificial: "artificial",
};

export interface PreparacionProps {
  pasos: PasoPreparacion[];
  /** Nombres de las variables de decisión del modelo (`modelo.variables.map(v => v.nombre)`), en orden. */
  nombresVariables: readonly string[];
  formato: FormatoNumero;
}

export function Preparacion({ pasos, nombresVariables, formato }: PreparacionProps) {
  const normalizaciones = pasos.filter((p) => p.tipo === "normalizar_limite");
  const agregarVariables = pasos.filter((p) => p.tipo === "agregar_variables");
  const formaEstandar = pasos.find((p) => p.tipo === "forma_estandar");
  const filaZCanonica = pasos.find((p) => p.tipo === "fila_z_canonica");
  const ajusteM = pasos.find((p) => p.tipo === "ajuste_m");

  return (
    <Collapsible className="rounded-lg border border-border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold">
        <ChevronRight aria-hidden="true" className="size-4 transition-transform group-data-[panel-open]:rotate-90" />
        Preparación
        <span className="font-normal text-muted-foreground">
          1 Normalizar · 2 Forma estándar · 3 Forma canónica · 4 Ajuste de M
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-5 border-t border-border px-3 py-3">
        <section aria-labelledby="preparacion-1" className="flex flex-col gap-2">
          <h4 id="preparacion-1" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            1. Normalizar límites negativos
          </h4>
          {normalizaciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ningún límite era negativo: no hizo falta normalizar.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {normalizaciones.map((paso) => {
                if (paso.tipo !== "normalizar_limite") return null;
                return (
                  <li key={paso.restriccionNumero} className="text-sm">
                    Restricción {paso.restriccionNumero}:{" "}
                    <Expresion
                      tokens={tokensRestriccionFraccion(
                        paso.coeficientesOriginales,
                        nombresVariables,
                        paso.relacionOriginal,
                        paso.limiteOriginal,
                        formato,
                      )}
                    />{" "}
                    se multiplica por (−1) →{" "}
                    <Expresion
                      tokens={tokensRestriccionFraccion(
                        paso.coeficientesNormalizados,
                        nombresVariables,
                        paso.relacionNormalizada,
                        paso.limiteNormalizado,
                        formato,
                      )}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="preparacion-2" className="flex flex-col gap-2">
          <h4 id="preparacion-2" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2. Forma estándar
          </h4>
          {agregarVariables.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {agregarVariables.map((paso) => {
                if (paso.tipo !== "agregar_variables") return null;
                const listaVariables = paso.variables
                  .map((v) => `${v.id} (${ETIQUETA_TIPO[v.tipo]})`)
                  .join(" y ");
                return (
                  <li key={paso.restriccionNumero}>
                    Restricción {paso.restriccionNumero} ({paso.relacion === "<=" ? "≤" : paso.relacion === ">=" ? "≥" : "="}):
                    se agregan {listaVariables}; básica inicial {paso.basicaInicial}.
                  </li>
                );
              })}
            </ul>
          ) : null}
          {formaEstandar !== undefined && formaEstandar.tipo === "forma_estandar" ? (
            <GrillaPreparacion
              nombresColumnas={formaEstandar.variables}
              formato={formato}
              filas={[
                ...formaEstandar.filas.map((fila, indice) => ({
                  etiqueta: `Ec. ${indice + 1}`,
                  valores: fila,
                  rhs: formaEstandar.ladoDerecho[indice],
                })),
                { etiqueta: "Z", valores: formaEstandar.objetivo, destacada: true },
              ]}
            />
          ) : null}
        </section>

        <section aria-labelledby="preparacion-3" className="flex flex-col gap-2">
          <h4 id="preparacion-3" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            3. Forma canónica de Z
          </h4>
          <p className="text-sm text-muted-foreground">
            La fila Z se reescribe como <code>z − Σcⱼxⱼ ∓ M·Aᵢ = 0</code> (docs/04 §2.4):
          </p>
          {filaZCanonica !== undefined && filaZCanonica.tipo === "fila_z_canonica" ? (
            <GrillaPreparacion
              nombresColumnas={formaEstandar?.tipo === "forma_estandar" ? formaEstandar.variables : []}
              formato={formato}
              conLadoDerecho={false}
              filas={[{ etiqueta: "Z", valores: filaZCanonica.filaZ }]}
            />
          ) : null}
        </section>

        <section aria-labelledby="preparacion-4" className="flex flex-col gap-2">
          <h4 id="preparacion-4" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            4. Ajuste de M (tabla inicial ajustada)
          </h4>
          {ajusteM !== undefined && ajusteM.tipo === "ajuste_m" ? (
            <>
              <GrillaPreparacion
                nombresColumnas={formaEstandar?.tipo === "forma_estandar" ? formaEstandar.variables : []}
                formato={formato}
                conLadoDerecho={false}
                filas={[
                  { etiqueta: "Z (antes)", valores: ajusteM.filaZAntes },
                  { etiqueta: "Z (después)", valores: ajusteM.filaZDespues, destacada: true },
                ]}
              />
              {ajusteM.operaciones.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {ajusteM.operaciones.map((operacion, indice) => (
                    <li key={indice}>{describirOperacion(operacion, formato)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ninguna artificial básica tenía M en la fila Z: la tabla inicial ya estaba ajustada.
                </p>
              )}
            </>
          ) : null}
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
