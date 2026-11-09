/**
 * Paso 4 del asistente — "Naturaleza de las cantidades"
 * (`features/asistente/paso-4-cantidades.tsx`).
 *
 * Port de `console-program/src/flow/definirNaturaleza.ts`: una sola pregunta, con las dos
 * opciones del catálogo `OPCIONES_NATURALEZA` en tarjetas (`RadioGroup`).
 */

"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";

import { OPCIONES_NATURALEZA } from "@/dominio/modelo/catalogos";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldLegend, FieldSet, FieldTitle, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { validarPaso4, type BorradorPaso4 } from "./estado";
import { BOTON_ATRAS, BOTON_CONTINUAR, PREGUNTA_NATURALEZA } from "./textos";

export interface Paso4CantidadesProps {
  valorInicial: BorradorPaso4;
  onContinuar: (borrador: BorradorPaso4) => void;
  onAtras: () => void;
}

export function Paso4Cantidades({ valorInicial, onContinuar, onAtras }: Paso4CantidadesProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);

  const form = useForm({
    defaultValues: valorInicial,
    onSubmit: async ({ value }) => {
      const resultado = validarPaso4(value);
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
        <FieldLegend>{PREGUNTA_NATURALEZA}</FieldLegend>
        <form.Field name="naturaleza">
          {(field) => (
            <>
              <RadioGroup value={field.state.value} onValueChange={(v) => field.handleChange(v)} aria-label={PREGUNTA_NATURALEZA}>
                {OPCIONES_NATURALEZA.map((opcion) => (
                  <FieldLabel key={opcion.valor} htmlFor={`naturaleza-${opcion.valor}`}>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{opcion.etiqueta}</FieldTitle>
                      </FieldContent>
                      <RadioGroupItem value={opcion.valor} id={`naturaleza-${opcion.valor}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </FieldSet>

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
