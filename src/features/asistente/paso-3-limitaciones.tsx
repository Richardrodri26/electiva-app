/**
 * Paso 3 del asistente — "Registrar limitaciones" (`features/asistente/paso-3-limitaciones.tsx`).
 *
 * Port de `console-program/src/flow/definirRestricciones.ts`: cada limitación es un bloque
 * de un `Accordion` titulado "Limitación n · {Nombre}" (docs/06-ux-ui.md §3.2), agregadas
 * con el botón "Agregar limitación" (decisión confirmada para la tarea T5.1: SIN preguntar
 * la cantidad de antemano). Cada limitación pide: tipo (catálogo, con "Otra" en línea),
 * cuánto aporta/consume cada opción, el límite y la forma de cumplimiento.
 */

"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";

import { FORMAS_CUMPLIMIENTO, TIPOS_RESTRICCION, VALOR_TIPO_RESTRICCION_OTRA } from "@/dominio/modelo/catalogos";
import { nombreNoVacio, numeroAsistente } from "@/dominio/modelo/esquemas";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  CANTIDAD_RESTRICCIONES_MAXIMA,
  crearRestriccionVacia,
  resolverNombreRestriccion,
  validarPaso3,
  type BorradorPaso3,
} from "./estado";
import {
  BOTON_AGREGAR_LIMITACION,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
  BOTON_QUITAR_LIMITACION,
  ETIQUETA_TIPO_LIMITACION_OTRA,
  PREGUNTA_FORMA_CUMPLIMIENTO,
  PREGUNTA_TIPO_LIMITACION,
  preguntaAporteLimitacion,
  preguntaLimiteLimitacion,
  tituloLimitacion,
} from "./textos";

export interface Paso3LimitacionesProps {
  valorInicial: BorradorPaso3;
  /** Etiquetas de las opciones (paso 1), en el mismo orden que cada `coeficientes`. */
  etiquetasOpciones: string[];
  onContinuar: (borrador: BorradorPaso3) => void;
  onAtras: () => void;
}

export function Paso3Limitaciones({ valorInicial, etiquetasOpciones, onContinuar, onAtras }: Paso3LimitacionesProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);
  const cantidadOpciones = etiquetasOpciones.length;

  const form = useForm({
    defaultValues: valorInicial,
    onSubmit: async ({ value }) => {
      const resultado = validarPaso3(value);
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
      <form.Field name="restricciones">
        {(limitaciones) => (
          <>
            <Accordion defaultValue={["0"]}>
              {limitaciones.state.value.map((restriccion, indice) => (
                <AccordionItem key={indice} value={String(indice)}>
                  <AccordionTrigger>
                    {tituloLimitacion(indice + 1, resolverNombreRestriccion(restriccion))}
                  </AccordionTrigger>
                  <AccordionContent>
                    <FieldGroup>
                      <FieldSet>
                        <FieldLegend variant="label">{PREGUNTA_TIPO_LIMITACION}</FieldLegend>
                        <form.Field name={`restricciones[${indice}].tipo`}>
                          {(campoTipo) => (
                            <>
                              <Select value={campoTipo.state.value} onValueChange={(v) => v !== null && campoTipo.handleChange(v)}>
                                <SelectTrigger aria-label={PREGUNTA_TIPO_LIMITACION}>
                                  <SelectValue>
                                    {(valor: number) => TIPOS_RESTRICCION.find((opcion) => opcion.valor === valor)?.etiqueta ?? ""}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {TIPOS_RESTRICCION.map((opcion) => (
                                    <SelectItem key={opcion.valor} value={opcion.valor}>
                                      {opcion.etiqueta}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {campoTipo.state.value === VALOR_TIPO_RESTRICCION_OTRA ? (
                                <form.Field
                                  name={`restricciones[${indice}].nombrePersonalizado`}
                                  validators={{ onBlur: nombreNoVacio }}
                                >
                                  {(campoNombre) => (
                                    <Field>
                                      <Label htmlFor={`limitacion-${indice}-nombre`}>
                                        {ETIQUETA_TIPO_LIMITACION_OTRA}
                                      </Label>
                                      <Input
                                        id={`limitacion-${indice}-nombre`}
                                        value={campoNombre.state.value}
                                        onChange={(e) => campoNombre.handleChange(e.target.value)}
                                        onBlur={campoNombre.handleBlur}
                                        aria-invalid={campoNombre.state.meta.errors.length > 0}
                                      />
                                      <FieldError errors={campoNombre.state.meta.errors} />
                                    </Field>
                                  )}
                                </form.Field>
                              ) : null}
                            </>
                          )}
                        </form.Field>
                      </FieldSet>

                      <form.Subscribe
                        selector={(state) => resolverNombreRestriccion(state.values.restricciones[indice]!)}
                      >
                        {(nombreLimitacion) => (
                          <FieldGroup>
                            {Array.from({ length: cantidadOpciones }, (_, iOpcion) => iOpcion).map((iOpcion) => (
                              <form.Field
                                key={iOpcion}
                                name={`restricciones[${indice}].coeficientes[${iOpcion}]`}
                                validators={{ onBlur: numeroAsistente }}
                              >
                                {(campoAporte) => (
                                  <Field orientation="responsive">
                                    <FieldLabel htmlFor={`limitacion-${indice}-aporte-${iOpcion}`}>
                                      {preguntaAporteLimitacion(etiquetasOpciones[iOpcion] ?? "", nombreLimitacion)}
                                    </FieldLabel>
                                    <FieldContent>
                                      <Input
                                        id={`limitacion-${indice}-aporte-${iOpcion}`}
                                        inputMode="decimal"
                                        value={campoAporte.state.value}
                                        onChange={(e) => campoAporte.handleChange(e.target.value)}
                                        onBlur={campoAporte.handleBlur}
                                        aria-invalid={campoAporte.state.meta.errors.length > 0}
                                      />
                                      <FieldError errors={campoAporte.state.meta.errors} />
                                    </FieldContent>
                                  </Field>
                                )}
                              </form.Field>
                            ))}

                            <form.Field name={`restricciones[${indice}].limite`} validators={{ onBlur: numeroAsistente }}>
                              {(campoLimite) => (
                                <Field orientation="responsive">
                                  <FieldLabel htmlFor={`limitacion-${indice}-limite`}>
                                    {preguntaLimiteLimitacion(nombreLimitacion)}
                                  </FieldLabel>
                                  <FieldContent>
                                    <Input
                                      id={`limitacion-${indice}-limite`}
                                      inputMode="decimal"
                                      value={campoLimite.state.value}
                                      onChange={(e) => campoLimite.handleChange(e.target.value)}
                                      onBlur={campoLimite.handleBlur}
                                      aria-invalid={campoLimite.state.meta.errors.length > 0}
                                    />
                                    <FieldError errors={campoLimite.state.meta.errors} />
                                  </FieldContent>
                                </Field>
                              )}
                            </form.Field>
                          </FieldGroup>
                        )}
                      </form.Subscribe>

                      <FieldSet>
                        <FieldLegend variant="label">{PREGUNTA_FORMA_CUMPLIMIENTO}</FieldLegend>
                        <form.Field name={`restricciones[${indice}].formaCumplimiento`}>
                          {(campoForma) => (
                            <RadioGroup
                              value={campoForma.state.value}
                              onValueChange={(v) => campoForma.handleChange(v)}
                              aria-label={PREGUNTA_FORMA_CUMPLIMIENTO}
                            >
                              {FORMAS_CUMPLIMIENTO.map((opcion) => (
                                <FieldLabel key={opcion.valor} htmlFor={`limitacion-${indice}-forma-${opcion.valor}`}>
                                  <Field orientation="horizontal">
                                    <FieldContent>
                                      <FieldTitle>{opcion.etiqueta}</FieldTitle>
                                    </FieldContent>
                                    <RadioGroupItem value={opcion.valor} id={`limitacion-${indice}-forma-${opcion.valor}`} />
                                  </Field>
                                </FieldLabel>
                              ))}
                            </RadioGroup>
                          )}
                        </form.Field>
                      </FieldSet>

                      {limitaciones.state.value.length > 1 ? (
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" size="sm" onClick={() => limitaciones.removeValue(indice)}>
                            {BOTON_QUITAR_LIMITACION}
                          </Button>
                        </div>
                      ) : null}
                    </FieldGroup>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div>
              <Button
                type="button"
                variant="outline"
                disabled={limitaciones.state.value.length >= CANTIDAD_RESTRICCIONES_MAXIMA}
                onClick={() => limitaciones.pushValue(crearRestriccionVacia(cantidadOpciones))}
              >
                {BOTON_AGREGAR_LIMITACION}
              </Button>
            </div>
          </>
        )}
      </form.Field>

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
