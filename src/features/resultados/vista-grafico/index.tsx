/**
 * Pestaña "Método gráfico" (`features/resultados/vista-grafico/index.tsx`) —
 * docs/05-metodo-grafico.md §4-5 y docs/07-plan-de-implementacion.md T6.4.
 *
 * Capas de la gráfica en `grafica.tsx`, geometría pura en `geometria.ts`, resumen accesible
 * en `resumen.ts`, panel de estado en `panel-resultado.tsx` y tabla de vértices en
 * `tabla-vertices.tsx` — ver cada archivo para el detalle.
 *
 * El layout compartido (`resultados-layout.tsx`) ya deshabilita esta pestaña (con tooltip)
 * cuando el modelo no tiene 2 variables, pero sigue montando `<TabsContent value="grafico">`
 * (y por lo tanto este componente) de todas formas — Base UI Tabs no desmonta los paneles
 * inactivos por defecto. Por eso este componente SIGUE validando `variables.length === 2` él
 * mismo (ver `resolverGrafico`, que lanza con otra cantidad): es la respuesta a la pregunta
 * explícita de la tarea ("confirmá si hace falta algo adicional acá dentro") — sí hace falta.
 */

"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { parsearFraccion } from "@/dominio/aritmetica/parseo";
import { recorridoSimplex } from "@/dominio/simplex/interpretar";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";
import { useSolucionGrafico } from "../use-solucion-grafico";
import { useSolucionSimplex } from "../use-solucion-simplex";
import { calcularNivelMaximo } from "./geometria";
import { Grafica } from "./grafica";
import { PanelResultado } from "./panel-resultado";
import { TablaVertices } from "./tabla-vertices";

export interface VistaGraficoProps {
  modelo: ModeloLineal;
  formato: FormatoNumero;
}

export function VistaGrafico({ modelo, formato }: VistaGraficoProps) {
  if (modelo.variables.length !== 2) {
    return (
      <EstadoVacio
        titulo="El método gráfico solo aplica a modelos con 2 variables"
        descripcion="Este modelo tiene otra cantidad de variables. Usa el Simplex para resolverlo."
      />
    );
  }

  return <ContenidoVistaGrafico modelo={modelo} formato={formato} />;
}

function ContenidoVistaGrafico({ modelo, formato }: VistaGraficoProps) {
  const resultado = useSolucionGrafico(modelo);
  const resultadoSimplex = useSolucionSimplex(modelo);

  const [nivelZ, setNivelZ] = useState(0);
  const [mostrarRecorrido, setMostrarRecorrido] = useState(false);
  const [verticeResaltado, setVerticeResaltado] = useState<string | null>(null);

  if (resultado.isPending) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row" aria-busy="true">
        <Skeleton className="aspect-square flex-1" />
        <Skeleton className="h-64 lg:w-80" />
      </div>
    );
  }

  if (resultado.isError || resultado.data === undefined) {
    return (
      <EstadoVacio
        titulo="No se pudo calcular la gráfica"
        descripcion="Vuelve a cargar la página o revisa el modelo en la pestaña Modelo."
      />
    );
  }

  const datos = resultado.data;
  const c1 = parsearFraccion(modelo.objetivo.coeficientes[0]!).aNumero();
  const c2 = parsearFraccion(modelo.objetivo.coeficientes[1]!).aNumero();
  const nivelMaximo = calcularNivelMaximo(c1, c2, datos.optimo?.z.aNumero(), datos.dominio.x1, datos.dominio.x2);

  const recorrido =
    resultadoSimplex.data !== undefined ? recorridoSimplex(resultadoSimplex.data, modelo) : [];

  const sinRegion = datos.estado === "infactible";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] print:grid-cols-1">
      <Card className="print:mx-auto print:w-full print:max-w-[14cm]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground">Gráfica</CardTitle>
        </CardHeader>
        <CardContent>
          <Grafica
            resultado={datos}
            modelo={modelo}
            formato={formato}
            nivelZ={nivelZ}
            mostrarRecorrido={mostrarRecorrido}
            recorrido={recorrido}
            verticeResaltado={verticeResaltado}
            onCambiarFoco={setVerticeResaltado}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <PanelResultado resultado={datos} formato={formato} />

        {!sinRegion ? (
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">Controles</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="slider-nivel-z">Recta de nivel: Z = {nivelZ.toFixed(2)}</Label>
                <Slider
                  id="slider-nivel-z"
                  min={0}
                  max={nivelMaximo}
                  step={nivelMaximo / 200}
                  value={[nivelZ]}
                  onValueChange={(valores) => setNivelZ(Array.isArray(valores) ? (valores[0] ?? 0) : valores)}
                  aria-label="Mover la recta de nivel de Z"
                />
              </div>

              {resultadoSimplex.data !== undefined && recorrido.length > 0 ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mostrar-recorrido"
                    checked={mostrarRecorrido}
                    onCheckedChange={(valor) => setMostrarRecorrido(valor === true)}
                  />
                  <Label htmlFor="mostrar-recorrido">Mostrar recorrido del Simplex</Label>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {datos.vertices.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground">Vértices</CardTitle>
            </CardHeader>
            <CardContent>
              <TablaVertices
                vertices={datos.vertices}
                modelo={modelo}
                formato={formato}
                verticeResaltado={verticeResaltado}
                onResaltar={setVerticeResaltado}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
