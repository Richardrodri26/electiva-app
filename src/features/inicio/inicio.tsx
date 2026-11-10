/**
 * `<Inicio>` (`features/inicio/inicio.tsx`) — pantalla de Inicio, docs/06-ux-ui.md §3.1.
 *
 * Dos acciones principales (asistente y editor), los ejercicios de clase precargados
 * (`public/ejemplos.json`, mostrados por su función objetivo) y, si hay historial, los 3
 * últimos modelos resueltos con "Ver todo" (abre el mismo `Sheet` del encabezado global).
 */

"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { generarTokensExpresion } from "@/dominio/modelo/formato";
import { serializarModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import { Expresion } from "@/components/comunes/expresion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEjemplos } from "@/features/ejemplos/use-ejemplos";
import {
  ETIQUETA_ESTADO,
  PanelHistorial,
  VARIANTE_BADGE_ESTADO,
} from "@/features/historial/panel-historial";
import { useHistorial } from "@/features/historial/use-historial";

const CANTIDAD_RECIENTES = 3;

/** `max Z = 3x₁ + 2x₂` como tokens: sentido en minúscula, igual que el mockup de docs/06 §3.1. */
function ObjetivoCompacto({ modelo }: { modelo: ModeloLineal }) {
  return (
    <Expresion
      tokens={[
        { tipo: "op", texto: `${modelo.objetivo.sentido === "max" ? "max" : "min"} ` },
        { tipo: "var", texto: modelo.objetivo.simbolo },
        { tipo: "op", texto: " = " },
        ...generarTokensExpresion(modelo.objetivo.coeficientes, modelo.variables),
      ]}
    />
  );
}

function textoRestricciones(cantidad: number): string {
  return cantidad === 1 ? "1 restricción" : `${cantidad} restricciones`;
}

function urlResolver(modelo: ModeloLineal): string {
  return `/resolver?m=${serializarModelo(modelo)}&vista=simplex`;
}

const sinSuscripcion = () => () => {};
const esCliente = () => true;
const esServidor = () => false;

export function Inicio() {
  const ejemplos = useEjemplos();
  const historial = useHistorial();
  const [historialAbierto, setHistorialAbierto] = useState(false);

  // El historial vive en `localStorage` (solo cliente): no se muestra hasta estar hidratado,
  // para que el primer render del cliente coincida con el HTML del servidor.
  const hidratado = useSyncExternalStore(sinSuscripcion, esCliente, esServidor);
  const recientes = hidratado ? (historial.data?.slice(0, CANTIDAD_RECIENTES) ?? []) : [];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold leading-tight">Programación lineal, paso a paso</h1>
        <p className="max-w-[72ch] text-base text-muted-foreground">
          Plantee su problema y resuélvalo por el método gráfico o por Simplex, viendo cada tabla como en clase.
        </p>
      </header>

      <section aria-labelledby="titulo-empezar" className="grid gap-4 md:grid-cols-2">
        <h2 id="titulo-empezar" className="sr-only">
          Cómo empezar
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tengo una situación real</CardTitle>
            <CardDescription>Lo guiamos con preguntas sencillas, sin términos técnicos.</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto border-0 bg-transparent">
            <Link href="/modelo/asistente" className={buttonVariants({ size: "lg", className: "h-11" })}>
              Empezar con preguntas
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Ya tengo el modelo</CardTitle>
            <CardDescription>Escriba la función objetivo y las restricciones directamente.</CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto border-0 bg-transparent">
            <Link
              href="/modelo/editor"
              className={buttonVariants({ size: "lg", variant: "outline", className: "h-11" })}
            >
              Abrir editor
            </Link>
          </CardFooter>
        </Card>
      </section>

      <section aria-labelledby="titulo-ejercicios" className="flex flex-col gap-3">
        <h2 id="titulo-ejercicios" className="text-xl font-bold">
          Ejercicios de clase
        </h2>
        {ejemplos.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}
        {ejemplos.isError ? (
          <p className="text-sm text-muted-foreground">No se pudieron cargar los ejercicios de clase.</p>
        ) : null}
        {ejemplos.data !== undefined ? (
          <ul className="flex flex-col gap-2">
            {ejemplos.data.map((ejemplo) => (
              <li
                key={ejemplo.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border p-3"
              >
                <p className="text-base">
                  <ObjetivoCompacto modelo={ejemplo.modelo} />
                  <span className="text-muted-foreground">
                    {" · "}
                    {textoRestricciones(ejemplo.modelo.restricciones.length)}
                  </span>
                </p>
                <Link
                  href={urlResolver(ejemplo.modelo)}
                  className={buttonVariants({ variant: "outline", className: "h-11" })}
                >
                  Resolver<span className="sr-only"> {ejemplo.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {recientes.length > 0 ? (
        <section aria-labelledby="titulo-recientes" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 id="titulo-recientes" className="text-xl font-bold">
              Recientes
            </h2>
            <Button variant="ghost" className="h-11" onClick={() => setHistorialAbierto(true)}>
              Ver todo
            </Button>
          </div>
          <ul className="flex flex-col gap-2">
            {recientes.map((entrada) => (
              <li
                key={entrada.hash}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/resolver?m=${serializarModelo(entrada.modelo)}`}
                    className="min-w-0 truncate rounded-sm text-base font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {entrada.titulo}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    <ObjetivoCompacto modelo={entrada.modelo} />
                  </span>
                </div>
                <Badge variant={VARIANTE_BADGE_ESTADO[entrada.estado]}>{ETIQUETA_ESTADO[entrada.estado]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PanelHistorial open={historialAbierto} onOpenChange={setHistorialAbierto} />
    </div>
  );
}
