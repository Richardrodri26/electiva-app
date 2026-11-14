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

import { repartirProblemas, validarPaso2, type BorradorPaso2 } from "./estado";
import {
  AVISO_ELEGIR_META_PRIMERO,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
  PREGUNTA_META,
  preguntaAporteObjetivo,
} from "./textos";

export interface Paso2QueLograProps {
  valorInicial: BorradorPaso2;
  /** Etiquetas de las opciones (paso 1), en el mismo orden que `coeficientes`. */
  etiquetasOpciones: string[];
  /** Unidad elegida en el paso 1 (texto final), para adaptar la pregunta ("cada hora de…"). */
  unidad: string;
  onContinuar: (borrador: BorradorPaso2) => void;
  onAtras: () => void;
}

export function Paso2QueLogra({ valorInicial, etiquetasOpciones, unidad, onContinuar, onAtras }: Paso2QueLograProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);

  const form = useForm({
    defaultValues: valorInicial,
    validators: {
      // Cada problema va al campo que falla; al pie solo quedan los que no son de un campo.
      onSubmit: ({ value }) => {
        const resultado = validarPaso2(value);
        if (resultado.success) return undefined;
        const nombres = new Set(["meta", ...value.coeficientes.map((_, i) => `coeficientes[${i}]`)]);
        const { campos, generales } = repartirProblemas(resultado.error.issues, nombres);
        setErroresPaso(generales);
        return { fields: campos };
      },
    },
    onSubmit: async ({ value }) => {
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

      <form.Subscribe
        selector={(state) => ({
          meta: state.values.meta,
          // Mismo criterio que `FieldError` del campo `meta`: si ese error se ve, el aviso no se repite.
          metaConError: (state.fieldMeta.meta?.errors.length ?? 0) > 0,
        })}
      >
        {({ meta, metaConError }) =>
          meta === null ? (
            metaConError ? null : <p className="text-sm text-muted-foreground">{AVISO_ELEGIR_META_PRIMERO}</p>
          ) : (
            <FieldGroup>
              {etiquetasOpciones.map((etiqueta, indice) => (
                <form.Field key={indice} name={`coeficientes[${indice}]`} validators={{ onBlur: numeroAsistente }}>
                  {(campo) => (
                    <Field orientation="responsive">
                      <FieldLabel htmlFor={`aporte-${indice}`}>{preguntaAporteObjetivo(meta, etiqueta, unidad)}</FieldLabel>
                      <FieldContent className="@md/field-group:w-40 @md/field-group:flex-none">
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
          )
        }
      </form.Subscribe>

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
