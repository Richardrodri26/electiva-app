/**
 * `<Editor>` (`features/editor/editor.tsx`) — editor técnico directo del modelo (T4.2),
 * ver docs/06-ux-ui.md §3.3 (mockup) y docs/02-arquitectura.md §3.3 (TanStack Form, modo
 * array, validación `onBlur` + `onSubmit`).
 *
 * Un solo `useForm` (docs/02 §3.3) sobre `BorradorEditor` (`estado.ts`). Variables (2 a 6)
 * y restricciones (1 a 6) en modo array: agregar/quitar usa las funciones puras de
 * `estado.ts` + `form.reset(...)` (nunca `pushValue`/`removeValue` sueltos) porque una sola
 * operación de variable toca TRES arrays a la vez (`variables`, `coeficientesObjetivo` y el
 * `coeficientes` de cada restricción) y `estado.ts` ya tiene, probado, el único lugar que
 * los mantiene sincronizados.
 *
 * Grilla accesible: cada celda numérica tiene su `aria-label` ("Coeficiente de x2 en R1") y
 * participa de la navegación con flechas de `navegacion-grilla.ts` (Tab usa el orden natural
 * del DOM). Responsive sin duplicar markup: cada fila es `flex flex-col` (tarjeta) por
 * debajo de `md` y `grid` (con las mismas columnas en todas las filas, para que alineen) a
 * partir de `md` — ver `estiloColumnas`.
 */

"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { ChevronDown, Plus, X } from "lucide-react";

import { generarTokensExpresion, generarTokensRestriccion } from "@/dominio/modelo/formato";
import { LIMITE_RESTRICCIONES, LIMITE_VARIABLES, nombreNoVacio, numeroEditor } from "@/dominio/modelo/esquemas";
import { serializarModelo } from "@/dominio/modelo/serializacion";
import type { Relacion, Variable } from "@/dominio/modelo/tipos";

import { Expresion } from "@/components/comunes/expresion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { useEjemplos } from "@/features/ejemplos/use-ejemplos";
import type { Ejemplo } from "@/features/ejemplos/ejemplos";
import { CLAVE_MODELO, CLAVE_VISTA } from "@/lib/url-state";

import { CeldaCoeficiente } from "./celda-coeficiente";
import {
  agregarRestriccion,
  agregarVariable,
  borradorDesdeModelo,
  CANTIDAD_VARIABLES_METODO_GRAFICO,
  construirModeloDesdeEditor,
  puedeAgregarRestriccion,
  puedeAgregarVariable,
  puedeQuitarRestriccion,
  puedeQuitarVariable,
  quitarRestriccion,
  quitarVariable,
  type BorradorEditor,
} from "./estado";
import { EtiquetaVariable } from "./etiqueta-variable";
import { idCeldaCoeficiente, manejarTeclaCelda } from "./navegacion-grilla";
import { useBorradorEditor } from "./use-borrador-editor";

export interface EditorProps {
  /** Se llama con la URL final (`/resolver?m=…&vista=…`) cuando el modelo valida con éxito. */
  onResolver?: (url: string) => void;
  className?: string;
}

const SIMBOLOS_RELACION: Record<Relacion, string> = { "<=": "≤", ">=": "≥", "=": "=" };

/** `gridTemplateColumns` compartido por todas las filas, para que alineen entre sí. */
function estiloColumnas(cantidadVariables: number): CSSProperties {
  return {
    gridTemplateColumns: `minmax(4.5rem,auto) repeat(${cantidadVariables}, minmax(4.5rem,1fr)) minmax(5rem,auto) minmax(5.5rem,auto) minmax(8rem,1fr) 2.25rem`,
  };
}

const FILA_TARJETA =
  "flex flex-col gap-2 rounded-lg border border-border p-3 md:grid md:items-center md:gap-x-2 md:gap-y-0 md:rounded-none md:border-x-0 md:border-t-0 md:p-2 md:[&:last-of-type]:border-b-0";

/** Wrapper responsive para una celda "extra" (relación/límite/nombre): tarjeta apilada en móvil, ítem de grilla en escritorio. */
function CeldaExtra({ etiquetaMovil, children }: { etiquetaMovil: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 md:contents">
      <span className="text-xs text-muted-foreground md:hidden">{etiquetaMovil}</span>
      {children}
    </div>
  );
}

function variablesDesdeBorrador(variables: BorradorEditor["variables"]): Variable[] {
  return variables.map((variable, indice) => ({
    nombre: `x${indice + 1}`,
    etiqueta: variable.etiqueta || `x${indice + 1}`,
    definicion: variable.definicion,
  }));
}

/** Vista previa en vivo: puede fallar mientras el usuario todavía está escribiendo un número. */
function intentar<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function textoCondiciones(cantidadVariables: number, soloEnteros: boolean): string {
  const nombres = Array.from({ length: cantidadVariables }, (_, i) => `x${i + 1}`).join(", ");
  return soloEnteros ? `${nombres} son números enteros no negativos` : `${nombres} ≥ 0`;
}

/**
 * Dispara el autoguardado (debounced) en un efecto, no durante el render: `form.Subscribe`
 * solo puede darnos los valores actuales vía su render-prop, así que el efecto vive en este
 * componente hijo dedicado, sin JSX propio (evita mutar un temporizador como side-effect del
 * render de `<Editor>`).
 */
function Autoguardado({ valores, guardar }: { valores: BorradorEditor; guardar: (valor: BorradorEditor) => void }) {
  useEffect(() => {
    guardar(valores);
  }, [valores, guardar]);
  return null;
}

export function Editor({ onResolver, className }: EditorProps) {
  const { borradorInicial, borradorRestaurado, guardarBorrador, limpiarBorradorGuardado } = useBorradorEditor();
  const [erroresEnvio, setErroresEnvio] = useState<string[]>([]);
  const vistaDeseada = useRef<"simplex" | "grafico">("simplex");
  const ejemplos = useEjemplos();

  const form = useForm({
    defaultValues: borradorInicial,
    onSubmit: async ({ value }) => {
      const resultado = construirModeloDesdeEditor(value);
      if (!resultado.ok) {
        setErroresEnvio([...new Set(resultado.errores.issues.map((issue) => issue.message))]);
        return;
      }
      setErroresEnvio([]);
      // El modelo ya quedó resuelto (y vive en `?m=` de /resolver): no tiene sentido seguir
      // ofreciendo "continuar" un borrador que ya se envió.
      limpiarBorradorGuardado();
      const parametros = new URLSearchParams();
      parametros.set(CLAVE_MODELO, serializarModelo(resultado.modelo));
      parametros.set(CLAVE_VISTA, vistaDeseada.current);
      onResolver?.(`/resolver?${parametros.toString()}`);
    },
  });

  // El borrador guardado de localStorage solo puede leerse recién montado en el cliente
  // (ver `use-borrador-editor.ts`): cuando llega, reemplaza los valores Y los defaults del
  // formulario (`form.reset`, no `setState`: TanStack Form no re-lee `defaultValues` solo).
  // Va en un efecto (no durante el render): leer/mutar un ref durante el render está
  // prohibido por las reglas de hooks del proyecto.
  useEffect(() => {
    if (borradorRestaurado !== null) {
      form.reset(borradorRestaurado);
    }
    // Solo debe aplicarse cuando `borradorRestaurado` pasa de `null` a un valor (una vez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorRestaurado]);

  function cargarEjemplo(ejemplo: Ejemplo): void {
    form.reset(borradorDesdeModelo(ejemplo.modelo));
  }

  function limites() {
    return {
      totalFilas: form.state.values.restricciones.length,
      totalColumnas: form.state.values.variables.length,
    };
  }

  return (
    <div className={className}>
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          evento.stopPropagation();
          void form.handleSubmit();
        }}
        className="flex flex-col gap-6"
      >
        {/* Sincroniza el borrador (para el autoguardado) en cada cambio de valores. */}
        <form.Subscribe selector={(state) => state.values}>
          {(valores) => <Autoguardado valores={valores} guardar={guardarBorrador} />}
        </form.Subscribe>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <form.Field name="sentido">
            {(campo) => (
              <RadioGroup
                value={campo.state.value}
                onValueChange={(valor) => campo.handleChange(valor as "max" | "min")}
                aria-label="Sentido del objetivo"
                className="flex w-auto flex-row gap-4"
              >
                <Label className="flex min-h-11 items-center gap-1.5">
                  <RadioGroupItem value="max" /> Maximizar
                </Label>
                <Label className="flex min-h-11 items-center gap-1.5">
                  <RadioGroupItem value="min" /> Minimizar
                </Label>
              </RadioGroup>
            )}
          </form.Field>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="outline" size="sm">
                  Cargar ejemplo
                  <ChevronDown />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {ejemplos.data === undefined || ejemplos.data.length === 0 ? (
                <DropdownMenuItem disabled>
                  {ejemplos.isLoading ? "Cargando…" : "No hay ejemplos disponibles"}
                </DropdownMenuItem>
              ) : (
                ejemplos.data.map((ejemplo) => (
                  <DropdownMenuItem key={ejemplo.id} onClick={() => cargarEjemplo(ejemplo)}>
                    {ejemplo.titulo}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grilla: encabezado de variables, fila del objetivo (Z) y una fila por restricción. */}
        <div className="flex flex-col md:rounded-lg md:border md:border-border">
          <form.Field name="variables">
            {(variablesField) => (
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border p-2 md:grid"
                style={estiloColumnas(variablesField.state.value.length)}
              >
                <span aria-hidden="true" />
                {variablesField.state.value.map((_, indice) => (
                  <form.Field key={indice} name={`variables[${indice}].etiqueta`} validators={{ onBlur: nombreNoVacio }}>
                    {(campo) => (
                      <EtiquetaVariable
                        indice={indice}
                        etiqueta={campo.state.value}
                        error={campo.state.meta.errors[0]?.message}
                        onCambiarEtiqueta={campo.handleChange}
                        onBlur={campo.handleBlur}
                        puedeQuitar={puedeQuitarVariable(form.state.values)}
                        onQuitar={() => form.reset(quitarVariable(form.state.values, indice))}
                      />
                    )}
                  </form.Field>
                ))}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Agregar una variable"
                        disabled={!puedeAgregarVariable(form.state.values)}
                        onClick={() => form.reset(agregarVariable(form.state.values))}
                      >
                        <Plus />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {puedeAgregarVariable(form.state.values)
                      ? "Agregar variable"
                      : `Máximo ${LIMITE_VARIABLES.maximo} variables.`}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </form.Field>

          {/* Fila del objetivo (Z). */}
          <form.Field name="variables">
            {(variablesField) => {
              const cantidadVariables = variablesField.state.value.length;
              return (
                <div className={FILA_TARJETA} style={estiloColumnas(cantidadVariables)}>
                  <span className="font-medium">Z =</span>
                  {Array.from({ length: cantidadVariables }, (_, columna) => (
                    <form.Field
                      key={columna}
                      name={`coeficientesObjetivo[${columna}]`}
                      validators={{ onBlur: numeroEditor }}
                    >
                      {(campo) => (
                        <CeldaCoeficiente
                          id={idCeldaCoeficiente(0, columna)}
                          valor={campo.state.value}
                          error={campo.state.meta.errors[0]?.message}
                          etiquetaAria={`Coeficiente de x${columna + 1} en Z`}
                          etiquetaMovil={`Aporte de x${columna + 1}`}
                          onChange={campo.handleChange}
                          onBlur={campo.handleBlur}
                          onKeyDown={(evento) => manejarTeclaCelda(evento, { fila: 0, columna }, limites())}
                        />
                      )}
                    </form.Field>
                  ))}
                </div>
              );
            }}
          </form.Field>

          {/* Una fila por restricción. */}
          <form.Field name="restricciones">
            {(restriccionesField) => (
              <>
                {restriccionesField.state.value.map((_, fila) => (
                  <form.Field key={fila} name={`restricciones[${fila}].coeficientes`}>
                    {(coeficientesField) => {
                      const cantidadVariables = coeficientesField.state.value.length;
                      return (
                        <div className={FILA_TARJETA} style={estiloColumnas(cantidadVariables)}>
                          <span className="font-medium">{`R${fila + 1}`}</span>

                          {Array.from({ length: cantidadVariables }, (_, columna) => (
                            <form.Field
                              key={columna}
                              name={`restricciones[${fila}].coeficientes[${columna}]`}
                              validators={{ onBlur: numeroEditor }}
                            >
                              {(campo) => (
                                <CeldaCoeficiente
                                  id={idCeldaCoeficiente(fila + 1, columna)}
                                  valor={campo.state.value}
                                  error={campo.state.meta.errors[0]?.message}
                                  etiquetaAria={`Coeficiente de x${columna + 1} en R${fila + 1}`}
                                  etiquetaMovil={`Aporte de x${columna + 1}`}
                                  onChange={campo.handleChange}
                                  onBlur={campo.handleBlur}
                                  onKeyDown={(evento) =>
                                    manejarTeclaCelda(evento, { fila: fila + 1, columna }, limites())
                                  }
                                />
                              )}
                            </form.Field>
                          ))}

                          <form.Field name={`restricciones[${fila}].relacion`}>
                            {(campo) => (
                              <CeldaExtra etiquetaMovil={`Relación de R${fila + 1}`}>
                                <Select
                                  value={campo.state.value}
                                  onValueChange={(valor) => valor !== null && campo.handleChange(valor as Relacion)}
                                >
                                  <SelectTrigger
                                    size="sm"
                                    aria-label={`Relación de la restricción R${fila + 1}`}
                                    className="w-full md:w-fit"
                                  >
                                    <SelectValue>
                                      {(valor: Relacion) => SIMBOLOS_RELACION[valor]}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="<=">≤</SelectItem>
                                    <SelectItem value=">=">≥</SelectItem>
                                    <SelectItem value="=">=</SelectItem>
                                  </SelectContent>
                                </Select>
                              </CeldaExtra>
                            )}
                          </form.Field>

                          <form.Field name={`restricciones[${fila}].limite`} validators={{ onBlur: numeroEditor }}>
                            {(campo) => (
                              <CeldaExtra etiquetaMovil={`Límite de R${fila + 1}`}>
                                <Input
                                  value={campo.state.value}
                                  aria-label={`Límite de la restricción R${fila + 1}`}
                                  aria-invalid={campo.state.meta.errors.length > 0}
                                  onChange={(evento) => campo.handleChange(evento.target.value)}
                                  onBlur={campo.handleBlur}
                                  className="text-right tabular-nums"
                                />
                              </CeldaExtra>
                            )}
                          </form.Field>

                          <form.Field name={`restricciones[${fila}].nombre`}>
                            {(campo) => (
                              <CeldaExtra etiquetaMovil={`Nombre de R${fila + 1}`}>
                                <Input
                                  value={campo.state.value}
                                  placeholder={`Restricción ${fila + 1}`}
                                  aria-label={`Nombre de la restricción R${fila + 1}`}
                                  onChange={(evento) => campo.handleChange(evento.target.value)}
                                  onBlur={campo.handleBlur}
                                />
                              </CeldaExtra>
                            )}
                          </form.Field>

                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="self-end md:self-auto"
                                  aria-label={`Quitar la restricción R${fila + 1}`}
                                  disabled={!puedeQuitarRestriccion(form.state.values)}
                                  onClick={() => form.reset(quitarRestriccion(form.state.values, fila))}
                                >
                                  <X />
                                </Button>
                              }
                            />
                            <TooltipContent>
                              {puedeQuitarRestriccion(form.state.values)
                                ? `Quitar la restricción R${fila + 1}`
                                : `Debe quedar al menos ${LIMITE_RESTRICCIONES.minimo} restricción.`}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    }}
                  </form.Field>
                ))}
              </>
            )}
          </form.Field>

          <div className="p-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!puedeAgregarRestriccion(form.state.values)}
                    onClick={() => form.reset(agregarRestriccion(form.state.values))}
                  >
                    <Plus /> Agregar restricción
                  </Button>
                }
              />
              <TooltipContent>
                {puedeAgregarRestriccion(form.state.values)
                  ? "Agregar restricción"
                  : `Máximo ${LIMITE_RESTRICCIONES.maximo} restricciones.`}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <form.Subscribe selector={(state) => state.values.variables.length}>
            {(cantidadVariables) => (
              <form.Field name="naturaleza">
                {(campo) => (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">
                      {textoCondiciones(cantidadVariables, campo.state.value === "entera")}
                    </span>
                    <Label className="flex min-h-11 items-center gap-2">
                      <Checkbox
                        checked={campo.state.value === "entera"}
                        onCheckedChange={(valor) => campo.handleChange(valor === true ? "entera" : "fraccionaria")}
                      />
                      Solo valores enteros
                    </Label>
                  </div>
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </div>

        <Card>
          <CardContent>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Vista previa</p>
            <form.Subscribe selector={(state) => state.values}>
              {(valores) => {
                const variables = variablesDesdeBorrador(valores.variables);
                const tokensObjetivo = intentar(() => generarTokensExpresion(valores.coeficientesObjetivo, variables));
                return (
                  <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-muted-foreground">
                        {valores.sentido === "max" ? "Maximizar" : "Minimizar"} Z =
                      </span>
                      {tokensObjetivo !== null ? (
                        <Expresion tokens={tokensObjetivo} />
                      ) : (
                        <span className="text-muted-foreground">Completá los números para ver la vista previa.</span>
                      )}
                    </div>
                    {valores.restricciones.map((restriccion, indice) => {
                      const tokens = intentar(() =>
                        generarTokensRestriccion(
                          restriccion.coeficientes,
                          variables,
                          restriccion.relacion,
                          restriccion.limite,
                        ),
                      );
                      return tokens !== null ? (
                        <Expresion key={indice} tokens={tokens} />
                      ) : (
                        <span key={indice} className="text-muted-foreground">
                          R{indice + 1}: completá los números para ver la vista previa.
                        </span>
                      );
                    })}
                  </div>
                );
              }}
            </form.Subscribe>
          </CardContent>
        </Card>

        {erroresEnvio.length > 0 ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <ul className="flex flex-col gap-1">
              {erroresEnvio.map((mensaje) => (
                <li key={mensaje}>{mensaje}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <form.Subscribe selector={(state) => state.values.variables.length}>
            {(cantidadVariables) => {
              const habilitado = cantidadVariables === CANTIDAD_VARIABLES_METODO_GRAFICO;
              return (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={!habilitado}
                        onClick={() => {
                          vistaDeseada.current = "grafico";
                        }}
                      >
                        Método gráfico
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {habilitado
                      ? "Resolver y mostrar la gráfica (solo 2 variables)."
                      : "Solo disponible con exactamente 2 variables."}
                  </TooltipContent>
                </Tooltip>
              );
            }}
          </form.Subscribe>

          <Button type="submit" onClick={() => (vistaDeseada.current = "simplex")}>
            Resolver con Simplex
          </Button>
        </div>
      </form>
    </div>
  );
}
