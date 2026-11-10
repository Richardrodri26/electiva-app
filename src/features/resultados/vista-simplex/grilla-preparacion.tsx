/**
 * Mini-grilla para los pasos de preparación que muestran un sistema completo
 * (`features/resultados/vista-simplex/grilla-preparacion.tsx`): "2 Forma estándar" (todas las
 * columnas, con 0 explícito donde no aparecen — docs/04-motor-simplex.md §2.2) y
 * "4 Ajuste de M" (fila Z antes/después).
 *
 * A diferencia de la tabla Simplex principal (`tabla-simplex.tsx`), estas grillas son
 * estáticas (no cambian de iteración, no tienen resaltado ni pivote), así que no usan
 * TanStack Table — serían columnas dinámicas sin ningún estado que headless table resuelva.
 */

import type { Fraccion } from "@/dominio/aritmetica/fraccion";
import type { ValorM } from "@/dominio/aritmetica/valor-m";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Expresion } from "@/components/comunes/expresion";
import type { FormatoNumero } from "@/dominio/modelo/formato";

import { CeldaMixta } from "./celda-valor";

export interface FilaGrillaPreparacion {
  etiqueta: string;
  valores: ReadonlyArray<Fraccion | ValorM>;
  rhs?: Fraccion | ValorM;
  destacada?: boolean;
}

export interface GrillaPreparacionProps {
  nombresColumnas: readonly string[];
  filas: readonly FilaGrillaPreparacion[];
  formato: FormatoNumero;
  /** `false` cuando ninguna fila tiene lado derecho (ej. la fila Z sola). */
  conLadoDerecho?: boolean;
}

export function GrillaPreparacion({
  nombresColumnas,
  filas,
  formato,
  conLadoDerecho = true,
}: GrillaPreparacionProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="sticky left-0 z-10 bg-card text-left">
              &nbsp;
            </TableHead>
            {nombresColumnas.map((nombre) => (
              <TableHead key={nombre} scope="col" className="text-right">
                <Expresion tokens={[{ tipo: "var", texto: nombre }]} />
              </TableHead>
            ))}
            {conLadoDerecho ? (
              <TableHead scope="col" className="text-right">
                R
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.etiqueta} className={fila.destacada ? "border-t-2 border-t-foreground/40" : undefined}>
              <TableHead scope="row" className="sticky left-0 z-10 bg-card text-left font-medium">
                {fila.etiqueta}
              </TableHead>
              {fila.valores.map((valor, indice) => (
                <TableCell key={nombresColumnas[indice]} className="text-right">
                  <CeldaMixta valor={valor} formato={formato} />
                </TableCell>
              ))}
              {conLadoDerecho ? (
                <TableCell className="text-right">
                  {fila.rhs !== undefined ? <CeldaMixta valor={fila.rhs} formato={formato} /> : null}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
