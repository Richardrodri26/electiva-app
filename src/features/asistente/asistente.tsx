/**
 * `<Asistente>` (`features/asistente/asistente.tsx`) — orquestador de los 5 pasos
 * (T5.1: pasos 1 a 4; T5.2: paso 5 "Revisar", banner de borrador y persistencia).
 *
 * Mantiene el borrador acumulado de los 4 pasos y el paso visible en `?paso=`
 * (`use-paso-asistente.ts`). Cada paso vive en su propio `useForm` (docs/02-arquitectura.md
 * §3.3); cuando un paso valida con éxito, este componente guarda el resultado y avanza.
 * Nunca se puede "saltar" al stepper a un paso posterior al último validado
 * (docs/06-ux-ui.md §3.2) — `pasoMaximoAlcanzado` controla eso.
 *
 * El `ModeloLineal` del paso 5 NO se guarda en un `useState` propio: se deriva con
 * `useMemo` a partir de `borrador` (`construirModeloDesdeAsistente`). Así, corregir una
 * sección puntual y volver al paso 5 (`terminarEnRevision`) no requiere sincronizar dos
 * copias del mismo dato — alcanza con que `borrador` cambie.
 *
 * Persistencia del borrador (docs/06-ux-ui.md §3.2, `borrador-almacenamiento.ts`): se
 * guarda en `localStorage` recién después de la primera vez que se avanza de paso
 * (`haIniciadoRef`), para no persistir — y ofrecer "continuar" sobre — un borrador vacío
 * que el usuario nunca tocó.
 *
 * El borrador guardado al montar se lee con `useSyncExternalStore` (no con
 * `useEffect` + `setState`): `getServerSnapshot` devuelve `null` tanto en el render del
 * servidor como en el primer render de hidratación en el cliente (son iguales, sin
 * `localStorage` real todavía), y React vuelve a consultar `getSnapshot` (que sí lee
 * `localStorage`) apenas termina de montar — sin el "cascading render" que
 * `react-hooks/set-state-in-effect` señala como anti-patrón para `setState` dentro de
 * un efecto.
 */

"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { borrar, guardar } from "@/lib/almacenamiento";

import { AsistentePasos } from "./asistente-pasos";
import { BannerBorradorSinTerminar } from "./banner-borrador-sin-terminar";
import {
  CLAVE_BORRADOR_ASISTENTE,
  obtenerInstantaneaBorradorGuardado,
  type BorradorGuardado,
} from "./borrador-almacenamiento";
import {
  construirModeloDesdeAsistente,
  crearBorradorAsistente,
  crearBorradorPaso3,
  crearCoeficientesVacios,
  limpiarParaCorregirOpciones,
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
import { Paso5Revisar } from "./paso-5-revisar";
import { AVISO_CORREGIR_OPCIONES, TITULOS_PASOS } from "./textos";
import { usePasoAsistente, type NumeroPasoAsistente } from "./use-paso-asistente";

export interface AsistenteProps {
  /** Se llama cada vez que el `ModeloLineal` queda armado (paso 4 validado, o al volver
   * al paso 5 tras corregir una sección puntual). */
  onModeloCompleto?: (modelo: ModeloLineal) => void;
  className?: string;
}

/** Redimensiona un array de aportes/coeficientes a `cantidad`, preservando lo ya escrito. */
function reajustarCoeficientes(actuales: string[], cantidad: number): string[] {
  if (actuales.length === cantidad) return actuales;
  if (actuales.length > cantidad) return actuales.slice(0, cantidad);
  return [...actuales, ...crearCoeficientesVacios(cantidad - actuales.length)];
}

/** `useSyncExternalStore` para el borrador guardado — ver nota arriba sobre por qué no
 * es un `useEffect` + `setState`. Referencias de módulo estables (no se recrean en
 * cada render), como pide la API de `useSyncExternalStore`. */
function suscribirABorradorGuardado(notificar: () => void): () => void {
  window.addEventListener("storage", notificar);
  return () => window.removeEventListener("storage", notificar);
}

function obtenerInstantaneaServidor(): BorradorGuardado | null {
  return null;
}

export function Asistente({ onModeloCompleto, className }: AsistenteProps) {
  const { paso, irAPaso } = usePasoAsistente();
  const [borrador, setBorrador] = useState<BorradorAsistente>(() => crearBorradorAsistente());
  const [pasoMaximoAlcanzado, setPasoMaximoAlcanzado] = useState<NumeroPasoAsistente>(1);
  // true recién después del primer avance de paso real — evita persistir (y ofrecer
  // "continuar" sobre) un borrador vacío que el usuario nunca llegó a tocar.
  const haIniciadoRef = useRef(false);
  // Sección puntual en corrección (paso 2 u 3, ver `corregirObjetivo`/`corregirLimitaciones`):
  // su "Continuar" debe volver directo al paso 5, no seguir la secuencia normal.
  const [corrigiendoSeccion, setCorrigiendoSeccion] = useState(false);

  // Si hay un borrador guardado al montar, se ofrece el banner (docs/06 §3.2) — ver nota
  // arriba sobre `useSyncExternalStore`. `bannerDescartado` lo oculta tras "Continuar" o
  // "Descartar", sin depender de que `localStorage` ya haya cambiado.
  const borradorGuardadoAlMontar = useSyncExternalStore(
    suscribirABorradorGuardado,
    obtenerInstantaneaBorradorGuardado,
    obtenerInstantaneaServidor,
  );
  const [bannerDescartado, setBannerDescartado] = useState(false);
  const borradorGuardado = bannerDescartado ? null : borradorGuardadoAlMontar;

  // El stepper/URL nunca puede mostrar un paso posterior al último validado.
  const pasoVisible = Math.min(paso, pasoMaximoAlcanzado) as NumeroPasoAsistente;
  useEffect(() => {
    if (paso !== pasoVisible) irAPaso(pasoVisible);
  }, [paso, pasoVisible, irAPaso]);

  // Persistencia: solo mientras haya progreso real (ver `haIniciadoRef`).
  useEffect(() => {
    if (!haIniciadoRef.current) return;
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador, paso: pasoVisible, pasoMaximoAlcanzado } satisfies BorradorGuardado);
  }, [borrador, pasoVisible, pasoMaximoAlcanzado]);

  const modeloCompleto = useMemo(() => {
    const resultado = construirModeloDesdeAsistente(borrador);
    return resultado.ok ? resultado.modelo : null;
  }, [borrador]);

  useEffect(() => {
    if (modeloCompleto) onModeloCompleto?.(modeloCompleto);
  }, [modeloCompleto, onModeloCompleto]);

  function avanzarA(siguiente: NumeroPasoAsistente): void {
    haIniciadoRef.current = true;
    setPasoMaximoAlcanzado((actual) => (siguiente > actual ? siguiente : actual));
    irAPaso(siguiente);
  }

  /** Vuelve al paso 1 reduciendo el alcance del stepper (lo inverso de `avanzarA`). */
  function retrocederA(siguiente: NumeroPasoAsistente): void {
    setPasoMaximoAlcanzado(siguiente);
    irAPaso(siguiente);
  }

  /** Arma el `ModeloLineal` final desde `siguienteBorrador` y, si es válido, va al paso 5. */
  function terminarEnRevision(siguienteBorrador: BorradorAsistente): void {
    const resultado = construirModeloDesdeAsistente(siguienteBorrador);
    if (resultado.ok) {
      avanzarA(5);
    }
    // Si no es válido no debería ocurrir (cada paso ya se validó individualmente antes
    // de llamar a esta función): no hay nada razonable que hacer salvo no avanzar.
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
    const siguienteBorrador: BorradorAsistente = { ...borrador, paso2: datosPaso2 };
    setBorrador(siguienteBorrador);
    if (corrigiendoSeccion) {
      setCorrigiendoSeccion(false);
      terminarEnRevision(siguienteBorrador);
      return;
    }
    avanzarA(3);
  }

  function manejarPaso3(datosPaso3: BorradorPaso3): void {
    const siguienteBorrador: BorradorAsistente = { ...borrador, paso3: datosPaso3 };
    setBorrador(siguienteBorrador);
    if (corrigiendoSeccion) {
      setCorrigiendoSeccion(false);
      terminarEnRevision(siguienteBorrador);
      return;
    }
    avanzarA(4);
  }

  function manejarPaso4(datosPaso4: BorradorPaso4): void {
    const siguienteBorrador: BorradorAsistente = { ...borrador, paso4: datosPaso4 };
    setBorrador(siguienteBorrador);
    setCorrigiendoSeccion(false);
    terminarEnRevision(siguienteBorrador);
  }

  /**
   * "Corregir las opciones" (sección `'variables'` del CLI, ver `modelBuilder.ts`): al
   * cambiar nombres/cantidad/unidad, los aportes (paso 2) y las limitaciones (paso 3)
   * quedan inconsistentes — se borran por completo y se avisa, igual que el CLI
   * (decisión #2 confirmada para T5.2). La naturaleza (paso 4) no se toca.
   */
  function manejarCorregirOpciones(): void {
    toast.info(AVISO_CORREGIR_OPCIONES);
    setBorrador(limpiarParaCorregirOpciones(borrador));
    retrocederA(1);
  }

  /** Corregir una limitación puntual o la naturaleza: vuelve directo a ese paso, sin
   * perder el resto — al continuar, `manejarPaso2`/`manejarPaso3` vuelven al paso 5. */
  function manejarCorregirObjetivo(): void {
    setCorrigiendoSeccion(true);
    irAPaso(2);
  }

  function manejarCorregirLimitaciones(): void {
    setCorrigiendoSeccion(true);
    irAPaso(3);
  }

  function manejarCorregirNaturaleza(): void {
    // `manejarPaso4` siempre vuelve al paso 5 directamente: no necesita el flag.
    irAPaso(4);
  }

  /** "Todo desde el inicio" — 5ta sección del mismo menú "Corregir…": reinicia los 4 pasos. */
  function manejarCorregirTodo(): void {
    setBorrador(crearBorradorAsistente());
    setCorrigiendoSeccion(false);
    retrocederA(1);
    borrar(CLAVE_BORRADOR_ASISTENTE);
    haIniciadoRef.current = false;
  }

  /** "Cancelar", ya confirmado el diálogo: borra el borrador y vuelve al inicio. */
  function manejarCancelarConfirmado(): void {
    borrar(CLAVE_BORRADOR_ASISTENTE);
    setBorrador(crearBorradorAsistente());
    setCorrigiendoSeccion(false);
    retrocederA(1);
    haIniciadoRef.current = false;
  }

  function continuarBorradorGuardado(): void {
    if (!borradorGuardado) return;
    setBorrador(borradorGuardado.borrador);
    setPasoMaximoAlcanzado(borradorGuardado.pasoMaximoAlcanzado);
    irAPaso(borradorGuardado.paso);
    haIniciadoRef.current = true;
    setBannerDescartado(true);
  }

  function descartarBorradorGuardado(): void {
    borrar(CLAVE_BORRADOR_ASISTENTE);
    setBannerDescartado(true);
  }

  const etiquetasOpciones = borrador.paso1.nombresOpciones;

  return (
    <div className={className}>
      {borradorGuardado ? (
        <BannerBorradorSinTerminar
          onContinuar={continuarBorradorGuardado}
          onDescartar={descartarBorradorGuardado}
          className="mb-6"
        />
      ) : null}

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

      {pasoVisible === 5 && modeloCompleto ? (
        <Paso5Revisar
          modelo={modeloCompleto}
          onCorregirOpciones={manejarCorregirOpciones}
          onCorregirObjetivo={manejarCorregirObjetivo}
          onCorregirLimitaciones={manejarCorregirLimitaciones}
          onCorregirNaturaleza={manejarCorregirNaturaleza}
          onCorregirTodo={manejarCorregirTodo}
          onCancelarConfirmado={manejarCancelarConfirmado}
        />
      ) : null}
    </div>
  );
}
