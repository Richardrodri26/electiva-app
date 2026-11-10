/**
 * Tabla Simplex de una iteración (`features/resultados/vista-simplex/tabla-simplex.tsx`),
 * docs/06-ux-ui.md §3.4 y §1.1.
 *
 * TanStack Table v9 (`@tanstack/react-table`, API nueva: `useTable`/`tableFeatures`, no la
 * v8 `useReactTable` — ver `node_modules/@tanstack/react-table/skills/getting-started` y
 * `skills/migrate-v8-to-v9`) con columnas dinámicas a partir de `resultado.columnas`. Solo
 * usa el modelo de filas básico (sin ordenar/filtrar/paginar), así que no registra ninguna
 * `feature` extra: `tableFeatures({})`.
 *
 * La columna "Base" es sticky con CSS (`sticky left-0`) en vez de la feature de pinning de
 * TanStack Table: solo hay una columna fijada, siempre en la posición 0, así que no hace
 * falta el cálculo de offsets que esa feature ofrece para fijar varias columnas.
 *
 * Indicadores SIN depender solo de color (docs/06 §1.1): la columna que entra lleva
 * "↓ entra" en el encabezado; la fila que sale lleva "sale →" en la celda Base; la razón de
 * la fila que sale lleva "◂"; el elemento pivote tiene borde doble. El resaltado de fondo
 * (`--resaltador`) es un refuerzo visual, nunca la única señal.
 *
 * El padre (`index.tsx`) le pone `key={...}` a esta vista al renderizarla, para reiniciar la
 * animación del resaltador (`resaltado.css` — ver ahí por qué es CSS global y no
 * `.module.css`) en cada cambio de iteración.
 */

"use client";

import { useMemo } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "cn";

import { Expresion } from "@/components/comunes/expresion";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatearValorNumerico, type FormatoNumero } from "@/dominio/modelo/formato";
import type { ColumnaTabla, TablaSimplex as DatosTablaSimplex } from "@/dominio/simplex/tipos";

import { CeldaMixta } from "./celda-valor";
import { describirColumna } from "./descripcion-columna";
import "./resaltado.css";

interface FilaTablaUI {
  esZ: boolean;
  /** -1 para la fila Z. */
  indiceFila: number;
}

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, FilaTablaUI>();

export interface TablaSimplexViewProps {
  tabla: DatosTablaSimplex;
  columnas: ColumnaTabla[];
  formato: FormatoNumero;
  /** Posición 1-based en el stepper, para "Tabla n de m". */
  posicion: number;
  total: number;
  /** Ej. "Solución alternativa", para la tabla extra de docs/06 §3.4. */
  etiquetaExtra?: string;
}

/** La columna pivote gana sobre la fila: evita animar el mismo elemento dos veces (docs/06 §1.3). */
function claseResaltado(esColumnaPivote: boolean, esFilaPivote: boolean): string | undefined {
  if (esColumnaPivote) return "vsx-columna-pivote";
  if (esFilaPivote) return "vsx-fila-pivote";
  return undefined;
}

export function TablaSimplexView({
  tabla,
  columnas,
  formato,
  posicion,
  total,
  etiquetaExtra,
}: TablaSimplexViewProps) {
  const decision = tabla.decision;
  const indiceColumnaPivote = decision?.columnaPivote;
  const indiceFilaPivote = decision?.filaPivote;

  const filasUI = useMemo<FilaTablaUI[]>(
    () => [...tabla.base.map((_base, indiceFila) => ({ esZ: false, indiceFila })), { esZ: true, indiceFila: -1 }],
    [tabla],
  );

  const columnasDef = useMemo(() => {
    const defs = [
      columnHelper.display({
        id: "base",
        header: () => "Base",
        cell: ({ row }) => {
          const fila = row.original;
          if (fila.esZ) {
            return <span className="font-semibold">Z</span>;
          }
          const nombre = tabla.base[fila.indiceFila]!;
          const esSaliente = indiceFilaPivote === fila.indiceFila;
          return (
            <span className="flex items-center gap-1.5">
              <Expresion tokens={[{ tipo: "var", texto: nombre }]} />
              {esSaliente ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-sale">
                  <ArrowRight aria-hidden="true" className="size-3" />
                  sale
                </span>
              ) : null}
            </span>
          );
        },
      }),
      ...columnas.map((columna, indiceColumna) =>
        columnHelper.display({
          id: columna.id,
          header: () => {
            const esEntrada = indiceColumnaPivote === indiceColumna;
            return (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="flex flex-col items-end gap-0.5">
                      <Expresion tokens={[{ tipo: "var", texto: columna.id }]} />
                      {esEntrada ? (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-entra">
                          <ArrowDown aria-hidden="true" className="size-3" />
                          entra
                        </span>
                      ) : null}
                    </span>
                  }
                />
                <TooltipContent>{describirColumna(columna)}</TooltipContent>
              </Tooltip>
            );
          },
          cell: ({ row }) => {
            const fila = row.original;
            const valor = fila.esZ ? tabla.filaZ[indiceColumna] : tabla.filas[fila.indiceFila]?.[indiceColumna];
            if (valor === undefined) return null;

            const esColumnaPivote = indiceColumnaPivote === indiceColumna;
            const esFilaPivote = !fila.esZ && indiceFilaPivote === fila.indiceFila;
            const esPivote = esColumnaPivote && esFilaPivote;

            return (
              <div
                className={cn(
                  "px-1 py-0.5",
                  claseResaltado(esColumnaPivote, esFilaPivote),
                  esPivote && "border-[3px] border-double border-foreground",
                )}
              >
                <CeldaMixta valor={valor} formato={formato} />
              </div>
            );
          },
        }),
      ),
      columnHelper.display({
        id: "R",
        header: () => "R",
        cell: ({ row }) => {
          const fila = row.original;
          const valor = fila.esZ ? tabla.valorZ : tabla.ladoDerecho[fila.indiceFila];
          if (valor === undefined) return null;
          const esFilaPivote = !fila.esZ && indiceFilaPivote === fila.indiceFila;
          return (
            <div className={cn("px-1 py-0.5", claseResaltado(false, esFilaPivote))}>
              <CeldaMixta valor={valor} formato={formato} />
            </div>
          );
        },
      }),
    ];

    if (decision !== undefined) {
      defs.push(
        columnHelper.display({
          id: "razon",
          header: () => "Razón",
          cell: ({ row }) => {
            const fila = row.original;
            if (fila.esZ) return null;
            const razon = decision.razones[fila.indiceFila];
            if (razon === undefined) return null;
            const esSaliente = indiceFilaPivote === fila.indiceFila;

            if ("excluida" in razon) {
              return (
                <span className="text-muted-foreground">
                  — <span className="text-xs">no participa (≤ 0)</span>
                </span>
              );
            }

            return (
              <span className="inline-flex items-center gap-1">
                {formatearValorNumerico(razon.valor, formato)}
                {esSaliente ? <span aria-hidden="true">◂</span> : null}
                {esSaliente ? <span className="sr-only">razón mínima: sale esta fila</span> : null}
              </span>
            );
          },
        }),
      );
    }

    return defs;
  }, [columnas, tabla, decision, formato, indiceColumnaPivote, indiceFilaPivote]);

  const table = useTable({ features, columns: columnasDef, data: filasUI });

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableCaption className="px-3 text-left">
          Tabla {posicion} de {total}, iteración {tabla.indice}
          {etiquetaExtra ? ` · ${etiquetaExtra}` : ""}
        </TableCaption>
        <TableHeader>
          {table.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id}>
              {grupo.headers.map((header) => (
                <TableHead
                  key={header.id}
                  scope="col"
                  className={cn("text-right", header.column.id === "base" && "sticky left-0 z-10 bg-card text-left")}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className={cn(row.original.esZ && "border-t-2 border-t-foreground/40")}>
              {row.getAllCells().map((cell) => {
                if (cell.column.id === "base") {
                  return (
                    <TableHead
                      key={cell.id}
                      scope="row"
                      className="sticky left-0 z-10 bg-card text-left font-medium"
                    >
                      <table.FlexRender cell={cell} />
                    </TableHead>
                  );
                }
                return (
                  <TableCell key={cell.id} className="text-right">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
