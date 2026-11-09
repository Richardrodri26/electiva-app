/**
 * Paso 1 del asistente — "Qué desea determinar" (`features/asistente/paso-1-que-decide.tsx`).
 *
 * Port de `console-program/src/flow/definirVariables.ts` a formulario (docs/06-ux-ui.md
 * §3.2): categoría en tarjetas (`RadioGroup`), cantidad de opciones a comparar (2 a 6,
 * `Select`), nombre de cada opción y unidad de medida (catálogo + "Otra" en línea).
 *
 * Un `useForm` por pantalla (docs/02-arquitectura.md §3.3), validado con
 * `esquemaPasoVariables` en el submit (`validarPaso1`, que resuelve primero la unidad
 * final). Los campos usan los esquemas Zod "hoja" (`nombreNoVacio`) en `onBlur` para
 * feedback inmediato; el `transform` final se aplica en el submit (ver `estado.ts`).
 */

"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";

import { CATEGORIAS, UNIDADES, VALOR_UNIDAD_OTRA } from "@/dominio/modelo/catalogos";
import { nombreNoVacio } from "@/dominio/modelo/esquemas";
import type { CategoriaId } from "@/dominio/modelo/tipos";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  CANTIDAD_OPCIONES_MAXIMA,
  CANTIDAD_OPCIONES_MINIMA,
  validarPaso1,
  type BorradorPaso1,
} from "./estado";
import {
  BOTON_CONTINUAR,
  ETIQUETA_CANTIDAD_OPCIONES,
  ETIQUETA_UNIDAD_OTRA,
  PREGUNTA_CANTIDAD_OPCIONES,
  PREGUNTA_CATEGORIA,
  PREGUNTA_UNIDAD,
  preguntaNombreOpcion,
} from "./textos";

const CANTIDADES_DISPONIBLES = Array.from(
  { length: CANTIDAD_OPCIONES_MAXIMA - CANTIDAD_OPCIONES_MINIMA + 1 },
  (_, i) => CANTIDAD_OPCIONES_MINIMA + i,
);

export interface Paso1QueDecideProps {
  valorInicial: BorradorPaso1;
  onContinuar: (borrador: BorradorPaso1) => void;
}

export function Paso1QueDecide({ valorInicial, onContinuar }: Paso1QueDecideProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);

  const form = useForm({
    defaultValues: valorInicial,
    onSubmit: async ({ value }) => {
      const resultado = validarPaso1(value);
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
        <FieldLegend>{PREGUNTA_CATEGORIA}</FieldLegend>
        <form.Field name="categoria">
          {(field) => (
            <>
              <RadioGroup
                value={field.state.value}
                onValueChange={(valor) => field.handleChange(valor as CategoriaId)}
                onBlur={field.handleBlur}
                aria-label={PREGUNTA_CATEGORIA}
                className="sm:grid-cols-2"
              >
                {CATEGORIAS.map((opcion) => (
                  <FieldLabel key={opcion.valor} htmlFor={`categoria-${opcion.valor}`}>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>{opcion.etiqueta}</FieldTitle>
                      </FieldContent>
                      <RadioGroupItem value={opcion.valor} id={`categoria-${opcion.valor}`} />
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              <FieldError errors={field.state.meta.errors} />
            </>
          )}
        </form.Field>
      </FieldSet>

      <form.Field name="nombresOpciones">
        {(opciones) => (
          <FieldGroup>
            <Field orientation="responsive">
              <FieldLabel htmlFor="cantidad-opciones">{ETIQUETA_CANTIDAD_OPCIONES}</FieldLabel>
              <FieldContent>
                <FieldDescription>{PREGUNTA_CANTIDAD_OPCIONES}</FieldDescription>
              </FieldContent>
              <Select
                value={opciones.state.value.length}
                onValueChange={(cantidad) => {
                  if (cantidad === null) return;
                  const actual = opciones.state.value.length;
                  if (cantidad > actual) {
                    for (let i = actual; i < cantidad; i++) opciones.pushValue("");
                  } else if (cantidad < actual) {
                    for (let i = actual - 1; i >= cantidad; i--) opciones.removeValue(i);
                  }
                }}
              >
                <SelectTrigger id="cantidad-opciones" aria-label={ETIQUETA_CANTIDAD_OPCIONES}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANTIDADES_DISPONIBLES.map((cantidad) => (
                    <SelectItem key={cantidad} value={cantidad}>
                      {cantidad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {opciones.state.value.map((_, indice) => (
              <form.Field key={indice} name={`nombresOpciones[${indice}]`} validators={{ onBlur: nombreNoVacio }}>
                {(campo) => (
                  <Field>
                    <FieldLabel htmlFor={`nombre-opcion-${indice}`}>{preguntaNombreOpcion(indice + 1)}</FieldLabel>
                    <Input
                      id={`nombre-opcion-${indice}`}
                      value={campo.state.value}
                      onChange={(evento) => campo.handleChange(evento.target.value)}
                      onBlur={campo.handleBlur}
                      aria-invalid={campo.state.meta.errors.length > 0}
                      aria-describedby={`nombre-opcion-${indice}-error`}
                    />
                    <FieldError id={`nombre-opcion-${indice}-error`} errors={campo.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            ))}
          </FieldGroup>
        )}
      </form.Field>

      <FieldGroup>
        <Field orientation="responsive">
          <FieldLabel htmlFor="unidad">{PREGUNTA_UNIDAD}</FieldLabel>
          <form.Field name="unidadId">
            {(field) => (
              <Select value={field.state.value} onValueChange={(valor) => valor !== null && field.handleChange(valor)}>
                <SelectTrigger id="unidad" aria-label={PREGUNTA_UNIDAD}>
                  <SelectValue>
                    {(valor: number) => UNIDADES.find((opcion) => opcion.valor === valor)?.etiqueta ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((opcion) => (
                    <SelectItem key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </Field>

        <form.Subscribe selector={(state) => state.values.unidadId}>
          {(unidadId) =>
            unidadId === VALOR_UNIDAD_OTRA ? (
              <form.Field name="unidadOtra" validators={{ onBlur: nombreNoVacio }}>
                {(campo) => (
                  <Field>
                    <Label htmlFor="unidad-otra">{ETIQUETA_UNIDAD_OTRA}</Label>
                    <Input
                      id="unidad-otra"
                      value={campo.state.value}
                      onChange={(evento) => campo.handleChange(evento.target.value)}
                      onBlur={campo.handleBlur}
                      aria-invalid={campo.state.meta.errors.length > 0}
                    />
                    <FieldError errors={campo.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>
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

      <div className="flex justify-end">
        <Button type="submit">{BOTON_CONTINUAR}</Button>
      </div>
    </form>
  );
}
