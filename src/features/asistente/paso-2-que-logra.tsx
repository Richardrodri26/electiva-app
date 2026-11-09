/**
 * Paso 2 del asistente — "Qué desea conseguir" (`features/asistente/paso-2-que-logra.tsx`).
 *
 * Port de `console-program/src/flow/definirObjetivo.ts`: la meta elegida (tarjetas,
 * `RadioGroup`) determina automáticamente si el modelo maximiza o minimiza
 * (`sentidoDesdeMeta`) — nunca se le pregunta esto al usuario (AGENTS.md regla de oro #5,
 * docs/01-producto.md HU-01). Una fila por opción con cuánto aporta o cuesta cada una
 * (docs/06-ux-ui.md §3.2).
 */

"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";

import { METAS } from "@/dominio/modelo/catalogos";
import { numeroAsistente } from "@/dominio/modelo/esquemas";
import type { MetaId } from "@/dominio/modelo/tipos";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { validarPaso2, type BorradorPaso2 } from "./estado";
import { BOTON_ATRAS, BOTON_CONTINUAR, PREGUNTA_META, preguntaAporteObjetivo } from "./textos";

export interface Paso2QueLograProps {
  valorInicial: BorradorPaso2;
  /** Etiquetas de las opciones (paso 1), en el mismo orden que `coeficientes`. */
  etiquetasOpciones: string[];
  onContinuar: (borrador: BorradorPaso2) => void;
  onAtras: () => void;
}

export function Paso2QueLogra({ valorInicial, etiquetasOpciones, onContinuar, onAtras }: Paso2QueLograProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);

  const form = useForm({
    defaultValues: valorInicial,
    onSubmit: async ({ value }) => {
      const resultado = validarPaso2(value);
      if (!resultado.success) {
        setErroresPaso([...new Set(resultado.error.issues.map((issue) => issue.message))]);
        return;
      }
      setErroresPaso([]);
      onContinuar(value);
    },
  });

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <FieldSet>
        <FieldLegend>{PREGUNTA_META}</FieldLegend>
        <form.Field name="meta">
          {(field) => (
            <>
              <RadioGroupMetas valor={field.state.value} onCambiar={(v) => field.handleChange(v)} onBlur={field.handleBlur} />
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </FieldSet>

      <FieldGroup>
        {etiquetasOpciones.map((etiqueta, indice) => (
          <form.Field key={indice} name={`coeficientes[${indice}]`} validators={{ onBlur: numeroAsistente }}>
            {(campo) => (
              <Field orientation="responsive">
                <FieldLabel htmlFor={`aporte-${indice}`}>{preguntaAporteObjetivo(etiqueta)}</FieldLabel>
                <FieldContent>
                  <Input
                    id={`aporte-${indice}`}
                    inputMode="decimal"
                    value={campo.state.value}
                    onChange={(evento) => campo.handleChange(evento.target.value)}
                    onBlur={campo.handleBlur}
                    aria-invalid={campo.state.meta.errors.length > 0}
                  />
                  <FieldError errors={campo.state.meta.errors} />
                </FieldContent>
              </Field>
            )}
          </form.Field>
        ))}
      </FieldGroup>

      {erroresPaso.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <ul className="flex flex-col gap-1">
            {erroresPaso.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onAtras}>
          {BOTON_ATRAS}
        </Button>
        <Button type="submit">{BOTON_CONTINUAR}</Button>
      </div>
    </form>
  );
}

function RadioGroupMetas({
  valor,
  onCambiar,
  onBlur,
}: {
  valor: MetaId | null;
  onCambiar: (valor: MetaId) => void;
  onBlur: () => void;
}) {
  return (
    <RadioGroup value={valor} onValueChange={(v) => onCambiar(v as MetaId)} onBlur={onBlur} aria-label={PREGUNTA_META} className="sm:grid-cols-2">
      {METAS.map((opcion) => (
        <FieldLabel key={opcion.valor} htmlFor={`meta-${opcion.valor}`}>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{opcion.etiqueta}</FieldTitle>
            </FieldContent>
            <RadioGroupItem value={opcion.valor} id={`meta-${opcion.valor}`} />
          </Field>
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}
