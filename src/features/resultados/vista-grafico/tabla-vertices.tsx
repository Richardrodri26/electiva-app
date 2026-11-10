/**
 * `<TablaVertices>` (`features/resultados/vista-grafico/tabla-vertices.tsx`) —
 * docs/05-metodo-grafico.md §4.2: tabla de vértices con TanStack Table, ordenable por Z,
 * con foco enlazado a la gráfica (pasar el cursor/foco por una fila resalta el vértice en
 * la gráfica, y viceversa — la mitad "viceversa" la maneja `index.tsx`, pasando el mismo
 * `verticeResaltado` de vuelta como prop).
 *
 * El stack (AGENTS.md) dice "TanStack Table v8", pero lo instalado en `package.json` es
 * `@tanstack/react-table@^9.3.1`, que es una reescritura con una API de registro de
 * "features" explícita (`tableFeatures`, `createColumnHelper`, `useTable`), distinta de
 * `useReactTable`/`getCoreRowModel`/`getSortedRowModel` de v8. Se usa la API real instalada
 * (confirmada leyendo `node_modules/@tanstack/react-table/skills/getting-started/SKILL.md` y
 * `node_modules/@tanstack/table-core/skills/table-features/references/sorting.md`, que la
 * propia librería incluye para agentes) — ver el resumen final de la tarea para el detalle.
 *
 * `onResaltar` se dispara con hover (mouse) Y con foco de teclado (`onFocus`/`onBlur` en la
 * fila, que ya es alcanzable por teclado vía `tabIndex`), para que el enlace funcione para
 * quien no usa mouse (docs/06-ux-ui.md §5: "Navegación completa con teclado").
 */

"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NumeroRacional, type ModoNumeroRacional } from "@/components/comunes/numero-racional";
import type { IdRecta, Vertice } from "@/dominio/grafico/tipos";
import type { FormatoNumero } from "@/dominio/modelo/formato";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

export interface TablaVerticesProps {
  vertices: readonly Vertice[];
  modelo: ModeloLineal;
  formato: FormatoNumero;
  /** Id del vértice resaltado (por hover/foco en la gráfica o en esta misma tabla), o `null`. */
  verticeResaltado: string | null;
  onResaltar: (id: string | null) => void;
}

/** "R{n} · {nombre}" para una restricción, o el texto de la no negatividad para los ejes. */
function etiquetaRecta(id: IdRecta, modelo: ModeloLineal): string {
  if (id === "eje_x1") {
    return "x1 ≥ 0";
  }
  if (id === "eje_x2") {
    return "x2 ≥ 0";
  }
  const restriccion = modelo.restricciones.find((r) => r.numero === id);
  return restriccion ? `R${id} · ${restriccion.nombre}` : `Restricción ${id}`;
}

// Features registradas a nivel de módulo (fuera del componente), como pide la guía de la
// propia librería ("Keep features ... at module scope") — ver cabecera del archivo.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, Vertice>();

export function TablaVertices({ vertices, modelo, formato, verticeResaltado, onResaltar }: TablaVerticesProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const modo: ModoNumeroRacional = formato === "decimal" ? "decimal" : "apilada";

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "vertice",
          header: "Vértice",
          enableSorting: false,
          cell: ({ row }) => <span className="font-serif font-semibold">{row.original.id}</span>,
        }),
        columnHelper.accessor((v) => v.punto.x1, {
          id: "x1",
          header: "x1",
          sortFn: (rowA, rowB) => rowA.original.punto.x1.comparar(rowB.original.punto.x1),
          cell: ({ row }) => <NumeroRacional valor={row.original.punto.x1} modo={modo} />,
        }),
        columnHelper.accessor((v) => v.punto.x2, {
          id: "x2",
          header: "x2",
          sortFn: (rowA, rowB) => rowA.original.punto.x2.comparar(rowB.original.punto.x2),
          cell: ({ row }) => <NumeroRacional valor={row.original.punto.x2} modo={modo} />,
        }),
        columnHelper.accessor((v) => v.z, {
          id: "z",
          header: "Z",
          sortFn: (rowA, rowB) => rowA.original.z.comparar(rowB.original.z),
          cell: ({ row }) => <NumeroRacional valor={row.original.z} modo={modo} />,
        }),
        columnHelper.display({
          id: "restricciones",
          header: "Restricciones activas",
          enableSorting: false,
          cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
              {row.original.restriccionesActivas.map((id) => etiquetaRecta(id, modelo)).join(" · ")}
            </span>
          ),
        }),
        columnHelper.display({
          id: "estado",
          header: "Estado",
          enableSorting: false,
          cell: ({ row }) => (row.original.esOptimo ? <Badge>Óptimo</Badge> : null),
        }),
      ]),
    [modelo, modo],
  );

  const tabla = useTable({
    features,
    columns,
    data: vertices as Vertice[],
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (v) => v.id,
  });

  return (
    <Table>
      <TableCaption className="text-left">Vértices de la región factible, ordenables por Z.</TableCaption>
      <TableHeader>
        {tabla.getHeaderGroups().map((grupo) => (
          <TableRow key={grupo.id}>
            {grupo.headers.map((header) => {
              const ordenable = header.column.getCanSort();
              const direccion = header.column.getIsSorted();
              return (
                <TableHead key={header.id} scope="col">
                  {ordenable ? (
                    <button
                      type="button"
                      className="inline-flex min-h-11 min-w-11 items-center gap-1 hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {direccion === "asc" ? (
                        <ArrowUp aria-hidden="true" className="size-3" />
                      ) : direccion === "desc" ? (
                        <ArrowDown aria-hidden="true" className="size-3" />
                      ) : (
                        <ArrowUpDown aria-hidden="true" className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {tabla.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            tabIndex={0}
            aria-selected={row.original.id === verticeResaltado}
            className={cn(
              "cursor-default outline-none",
              row.original.id === verticeResaltado && "bg-primary/10",
            )}
            onMouseEnter={() => onResaltar(row.original.id)}
            onMouseLeave={() => onResaltar(null)}
            onFocus={() => onResaltar(row.original.id)}
            onBlur={() => onResaltar(null)}
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
