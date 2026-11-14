/**
 * Paso 3 del asistente — "Registrar limitaciones" (`features/asistente/paso-3-limitaciones.tsx`).
 *
 * Port de `console-program/src/flow/definirRestricciones.ts`: cada limitación es un bloque
 * de un `Accordion` titulado "Limitación n · {Nombre}" (docs/06-ux-ui.md §3.2), agregadas
 * con el botón "Agregar limitación" (decisión confirmada para la tarea T5.1: SIN preguntar
 * la cantidad de antemano). Cada limitación pide: tipo (catálogo, con "Otra" en línea),
 * cuánto usa cada opción, la forma de cumplimiento y el límite (cuya pregunta se adapta a
 * la forma elegida; al elegir ciertos tipos se sugiere la forma, ver `formaSugeridaParaTipo`).
 */

"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { TrashIcon } from "lucide-react";

import { FORMAS_CUMPLIMIENTO, TIPOS_RESTRICCION, VALOR_TIPO_RESTRICCION_OTRA } from "@/dominio/modelo/catalogos";
import { nombreNoVacio, numeroAsistente } from "@/dominio/modelo/esquemas";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  CANTIDAD_RESTRICCIONES_MAXIMA,
  crearRestriccionVacia,
  formaSugeridaParaTipo,
  repartirProblemas,
  resolverNombreRestriccion,
  validarPaso3,
  type BorradorPaso3,
} from "./estado";
import {
  BOTON_AGREGAR_LIMITACION,
  BOTON_ATRAS,
  BOTON_CONTINUAR,
  DESCRIPCION_APORTE_LIMITACION,
  DESCRIPCION_APORTE_LIMITACION_TOTAL,
  ETIQUETA_TIPO_LIMITACION_OTRA,
  PREGUNTA_FORMA_CUMPLIMIENTO,
  PREGUNTA_TIPO_LIMITACION,
  botonQuitarLimitacion,
  preguntaAporteLimitacion,
  preguntaLimiteLimitacion,
  tituloLimitacion,
} from "./textos";

/** Tipos de limitación (ids de `TIPOS_RESTRICCION`) cuyo aporte es 1 o 0: "Cantidad máxima" y "Cantidad total". */
const TIPOS_CON_APORTE_SI_O_NO: readonly number[] = [5, 7];

const PATRON_INDICE_LIMITACION = /^restricciones\[(\d+)\]/;

export interface Paso3LimitacionesProps {
  valorInicial: BorradorPaso3;
  /** Etiquetas de las opciones (paso 1), en el mismo orden que cada `coeficientes`. */
  etiquetasOpciones: string[];
  /** Unidad elegida en el paso 1 (texto final), para adaptar la pregunta ("cada hora de…"). */
  unidad: string;
  onContinuar: (borrador: BorradorPaso3) => void;
  onAtras: () => void;
}

export function Paso3Limitaciones({ valorInicial, etiquetasOpciones, unidad, onContinuar, onAtras }: Paso3LimitacionesProps) {
  const [erroresPaso, setErroresPaso] = useState<string[]>([]);
  // Limitaciones desplegadas (valores = índices como texto). Controlado para abrir la
  // recién agregada y las que tienen errores al intentar continuar.
  const [abiertas, setAbiertas] = useState<string[]>(["0"]);
  const cantidadOpciones = etiquetasOpciones.length;

  const form = useForm({
    defaultValues: valorInicial,
    validators: {
      // Cada problema va al campo que falla; al pie solo quedan los que no son de un campo.
      onSubmit: ({ value }) => {
        const resultado = validarPaso3(value);
        if (resultado.success) return undefined;
        const nombres = new Set<string>();
        value.restricciones.forEach((restriccion, i) => {
          nombres.add(`restricciones[${i}].nombrePersonalizado`);
          nombres.add(`restricciones[${i}].limite`);
          restriccion.coeficientes.forEach((_, j) => nombres.add(`restricciones[${i}].coeficientes[${j}]`));
        });
        const { campos, generales } = repartirProblemas(resultado.error.issues, nombres, (ruta) =>
          // "Ninguna opción interviene": error de toda la lista, se muestra en el primer aporte.
          ruta.length === 3 && ruta[0] === "restricciones" && ruta[2] === "coeficientes"
            ? `restricciones[${String(ruta[1])}].coeficientes[0]`
            : undefined,
        );
        setErroresPaso(generales);
        const conError = Object.keys(campos)
          .map((nombre) => PATRON_INDICE_LIMITACION.exec(nombre)?.[1])
          .filter((indice): indice is string => indice !== undefined);
        setAbiertas((previas) => [...new Set([...previas, ...conError])]);
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
      <form.Field name="restricciones">
        {(limitaciones) => (
          <>
            <Accordion value={abiertas} onValueChange={(valor) => setAbiertas(valor.map(String))}>
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
                              <Select
                                value={campoTipo.state.value}
                                onValueChange={(v) => {
                                  if (v === null) return;
                                  campoTipo.handleChange(v);
                                  const forma = formaSugeridaParaTipo(v);
                                  if (forma !== null) {
                                    form.setFieldValue(`restricciones[${indice}].formaCumplimiento`, forma);
                                  }
                                }}
                              >
                                <SelectTrigger aria-label={PREGUNTA_TIPO_LIMITACION} className="w-full sm:w-72">
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
                        selector={(state) => {
                          const actual = state.values.restricciones[indice]!;
                          return `${actual.tipo}|${resolverNombreRestriccion(actual)}`;
                        }}
                      >
                        {(clave) => {
                          const separador = clave.indexOf("|");
                          const tipo = Number(clave.slice(0, separador));
                          const nombreLimitacion = clave.slice(separador + 1);
                          return (
                            <FieldGroup>
                              {Array.from({ length: cantidadOpciones }, (_, iOpcion) => iOpcion).map((iOpcion) => (
                                <form.Field
                                  key={iOpcion}
                                  name={`restricciones[${indice}].coeficientes[${iOpcion}]`}
                                  validators={{ onBlur: numeroAsistente }}
                                >
                                  {(campoAporte) => (
                                    <Field orientation="responsive">
                                      <FieldContent>
                                        <FieldLabel htmlFor={`limitacion-${indice}-aporte-${iOpcion}`}>
                                          {preguntaAporteLimitacion(etiquetasOpciones[iOpcion] ?? "", nombreLimitacion, unidad)}
                                        </FieldLabel>
                                        {iOpcion === 0 ? (
                                          <FieldDescription>
                                            {TIPOS_CON_APORTE_SI_O_NO.includes(tipo)
                                              ? DESCRIPCION_APORTE_LIMITACION_TOTAL
                                              : DESCRIPCION_APORTE_LIMITACION}
                                          </FieldDescription>
                                        ) : null}
                                      </FieldContent>
                                      <FieldContent className="@md/field-group:w-40 @md/field-group:flex-none">
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
                            </FieldGroup>
                          );
                        }}
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

                      <form.Subscribe
                        selector={(state) => {
                          const actual = state.values.restricciones[indice]!;
                          return `${actual.formaCumplimiento}|${resolverNombreRestriccion(actual)}`;
                        }}
                      >
                        {(clave) => {
                          const separador = clave.indexOf("|");
                          const forma = Number(clave.slice(0, separador));
                          const nombreLimitacion = clave.slice(separador + 1);
                          return (
                            <form.Field name={`restricciones[${indice}].limite`} validators={{ onBlur: numeroAsistente }}>
                              {(campoLimite) => (
                                <Field orientation="responsive">
                                  <FieldLabel htmlFor={`limitacion-${indice}-limite`}>
                                    {preguntaLimiteLimitacion(nombreLimitacion, forma)}
                                  </FieldLabel>
                                  <FieldContent className="@md/field-group:w-40 @md/field-group:flex-none">
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
                          );
                        }}
                      </form.Subscribe>

                      {limitaciones.state.value.length > 1 ? (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              limitaciones.removeValue(indice);
                              // Los índices posteriores se corren una posición.
                              setAbiertas((previas) =>
                                previas
                                  .map(Number)
                                  .filter((abierta) => abierta !== indice)
                                  .map((abierta) => String(abierta > indice ? abierta - 1 : abierta)),
                              );
                            }}
                          >
                            <TrashIcon data-icon="inline-start" aria-hidden="true" />
                            {botonQuitarLimitacion(indice + 1)}
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
                onClick={() => {
                  const nueva = limitaciones.state.value.length;
                  limitaciones.pushValue(crearRestriccionVacia(cantidadOpciones));
                  setAbiertas([String(nueva)]);
                }}
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
