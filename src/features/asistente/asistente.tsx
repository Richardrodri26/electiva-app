/**
 * `<Asistente>` (`features/asistente/asistente.tsx`) — orquestador de los pasos 1 a 4
 * (tarea T5.1; el paso 5 "Revisar" es otra tarea, ver AGENTS.md).
 *
 * Mantiene el borrador acumulado de los 4 pasos y el paso visible en `?paso=`
 * (`use-paso-asistente.ts`). Cada paso vive en su propio `useForm` (docs/02-arquitectura.md
 * §3.3); cuando un paso valida con éxito, este componente guarda el resultado y avanza.
 * Nunca se puede "saltar" al stepper a un paso posterior al último validado
 * (docs/06-ux-ui.md §3.2) — `pasoMaximoAlcanzado` controla eso.
 *
 * Cuando el paso 4 valida, se ensambla el `ModeloLineal` completo
 * (`construirModeloDesdeAsistente`) y se avisa vía `onModeloCompleto` — quien use este
 * componente decide qué hacer con él (mostrarlo, navegar al resumen del paso 5, etc.;
 * esa pantalla está fuera del alcance de esta tarea).
 */

"use client";

import { useEffect, useState } from "react";

import type { ModeloLineal } from "@/dominio/modelo/tipos";

import { AsistentePasos } from "./asistente-pasos";
import {
  construirModeloDesdeAsistente,
  crearBorradorAsistente,
  crearBorradorPaso3,
  crearCoeficientesVacios,
  type BorradorAsistente,
  type BorradorPaso1,
  type BorradorPaso2,
  type BorradorPaso3,
  type BorradorPaso4,
} from "./estado";
import { Paso1QueDecide } from "./paso-1-que-decide";
import { Paso2QueLogra } from "./paso-2-que-logra";
import { Paso3Limitaciones } from "./paso-3-limitaciones";
import { Paso4Cantidades } from "./paso-4-cantidades";
import { TITULOS_PASOS } from "./textos";
import { usePasoAsistente, type NumeroPasoAsistente } from "./use-paso-asistente";

export interface AsistenteProps {
  /** Se llama cuando el paso 4 termina de validarse y el `ModeloLineal` queda armado. */
  onModeloCompleto?: (modelo: ModeloLineal) => void;
  className?: string;
}

/** Redimensiona un array de aportes/coeficientes a `cantidad`, preservando lo ya escrito. */
function reajustarCoeficientes(actuales: string[], cantidad: number): string[] {
  if (actuales.length === cantidad) return actuales;
  if (actuales.length > cantidad) return actuales.slice(0, cantidad);
  return [...actuales, ...crearCoeficientesVacios(cantidad - actuales.length)];
}

export function Asistente({ onModeloCompleto, className }: AsistenteProps) {
  const { paso, irAPaso } = usePasoAsistente();
  const [borrador, setBorrador] = useState<BorradorAsistente>(() => crearBorradorAsistente());
  const [pasoMaximoAlcanzado, setPasoMaximoAlcanzado] = useState<NumeroPasoAsistente>(1);

  // El stepper/URL nunca puede mostrar un paso posterior al último validado.
  const pasoVisible = Math.min(paso, pasoMaximoAlcanzado) as NumeroPasoAsistente;
  useEffect(() => {
    if (paso !== pasoVisible) irAPaso(pasoVisible);
  }, [paso, pasoVisible, irAPaso]);

  function avanzarA(siguiente: NumeroPasoAsistente): void {
    setPasoMaximoAlcanzado((actual) => (siguiente > actual ? siguiente : actual));
    irAPaso(siguiente);
  }

  function manejarPaso1(datosPaso1: BorradorPaso1): void {
    const cantidad = datosPaso1.nombresOpciones.length;
    setBorrador((anterior) => ({
      ...anterior,
      paso1: datosPaso1,
      paso2: { ...anterior.paso2, coeficientes: reajustarCoeficientes(anterior.paso2.coeficientes, cantidad) },
      paso3: {
        restricciones: anterior.paso3.restricciones.map((restriccion) => ({
          ...restriccion,
          coeficientes: reajustarCoeficientes(restriccion.coeficientes, cantidad),
        })),
      },
    }));
    avanzarA(2);
  }

  function manejarPaso2(datosPaso2: BorradorPaso2): void {
    setBorrador((anterior) => ({ ...anterior, paso2: datosPaso2 }));
    avanzarA(3);
  }

  function manejarPaso3(datosPaso3: BorradorPaso3): void {
    setBorrador((anterior) => ({ ...anterior, paso3: datosPaso3 }));
    avanzarA(4);
  }

  function manejarPaso4(datosPaso4: BorradorPaso4): void {
    const siguienteBorrador: BorradorAsistente = { ...borrador, paso4: datosPaso4 };
    setBorrador(siguienteBorrador);
    const resultado = construirModeloDesdeAsistente(siguienteBorrador);
    if (resultado.ok) {
      onModeloCompleto?.(resultado.modelo);
    }
  }

  const etiquetasOpciones = borrador.paso1.nombresOpciones;

  return (
    <div className={className}>
      <AsistentePasos pasoActual={pasoVisible} pasoMaximoAlcanzado={pasoMaximoAlcanzado} onIrAPaso={irAPaso} className="mb-6" />

      <h2 className="sr-only">{TITULOS_PASOS[pasoVisible - 1]}</h2>

      {pasoVisible === 1 ? <Paso1QueDecide valorInicial={borrador.paso1} onContinuar={manejarPaso1} /> : null}

      {pasoVisible === 2 ? (
        <Paso2QueLogra
          valorInicial={borrador.paso2}
          etiquetasOpciones={etiquetasOpciones}
          onContinuar={manejarPaso2}
          onAtras={() => irAPaso(1)}
        />
      ) : null}

      {pasoVisible === 3 ? (
        <Paso3Limitaciones
          valorInicial={
            borrador.paso3.restricciones.length > 0 ? borrador.paso3 : crearBorradorPaso3(etiquetasOpciones.length)
          }
          etiquetasOpciones={etiquetasOpciones}
          onContinuar={manejarPaso3}
          onAtras={() => irAPaso(2)}
        />
      ) : null}

      {pasoVisible === 4 ? (
        <Paso4Cantidades valorInicial={borrador.paso4} onContinuar={manejarPaso4} onAtras={() => irAPaso(3)} />
      ) : null}
    </div>
  );
}
