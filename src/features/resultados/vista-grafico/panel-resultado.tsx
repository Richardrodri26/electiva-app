/**
 * `<PanelResultado>` (`features/resultados/vista-grafico/panel-resultado.tsx`) —
 * docs/05-metodo-grafico.md §4.3 y docs/06-ux-ui.md §4 (tabla de estados y mensajes):
 * alerta con el estado en lenguaje claro, la solución óptima y, si aplica, el mejor punto
 * entero y la diferencia con el óptimo continuo.
 */

import { AlertTriangle, CheckCircle2, Info, TrendingUp, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { ResultadoGrafico } from "@/dominio/grafico/tipos";

export interface PanelResultadoProps {
  resultado: ResultadoGrafico;
  formato: FormatoNumero;
}

export function PanelResultado({ resultado, formato }: PanelResultadoProps) {
  const fmt = (valor: Parameters<typeof formatearValorNumerico>[0]) => formatearValorNumerico(valor, formato);

  return (
    <div className="flex flex-col gap-3">
      {resultado.estado === "optimo" && resultado.optimo !== undefined ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Solución óptima</AlertTitle>
          <AlertDescription>
            Z = {fmt(resultado.optimo.z)} con x1 = {fmt(resultado.optimo.punto.x1)} y x2 ={" "}
            {fmt(resultado.optimo.punto.x2)}.
          </AlertDescription>
        </Alert>
      ) : null}

      {resultado.estado === "optimos_alternativos" && resultado.optimo !== undefined ? (
        <Alert>
          <Info aria-hidden="true" />
          <AlertTitle>Hay más de una solución óptima</AlertTitle>
          <AlertDescription>
            Varios puntos de la región dan el mismo mejor resultado, Z = {fmt(resultado.optimo.z)}. Todos los
            vértices marcados &ldquo;Óptimo&rdquo; en la gráfica y la tabla son igualmente buenos.
          </AlertDescription>
        </Alert>
      ) : null}

      {resultado.estado === "no_acotado" ? (
        <Alert>
          <TrendingUp aria-hidden="true" />
          <AlertTitle>Z puede crecer sin límite</AlertTitle>
          <AlertDescription>Falta alguna limitación: revise sus restricciones.</AlertDescription>
        </Alert>
      ) : null}

      {resultado.estado === "infactible" ? (
        <Alert variant="destructive">
          <XCircle aria-hidden="true" />
          <AlertTitle>No hay ningún punto que cumpla todo a la vez</AlertTitle>
          <AlertDescription>Revise los límites de sus restricciones.</AlertDescription>
        </Alert>
      ) : null}

      {resultado.mejorEntero !== undefined ? (
        <Alert>
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Mejor opción con números enteros</AlertTitle>
          <AlertDescription>
            x1 = {fmt(resultado.mejorEntero.punto.x1)}, x2 = {fmt(resultado.mejorEntero.punto.x2)}, Z ={" "}
            {fmt(resultado.mejorEntero.z)}
            {resultado.optimo !== undefined
              ? ` (el óptimo sin esa condición da Z = ${fmt(resultado.optimo.z)}).`
              : "."}
          </AlertDescription>
        </Alert>
      ) : null}

      {(resultado.avisos ?? []).map((aviso) => (
        <Alert key={aviso}>
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Aviso</AlertTitle>
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
