/**
 * Página interna de desarrollo (`/dev/componentes`) — T1.5 de
 * docs/07-plan-de-implementacion.md.
 *
 * Muestra los componentes comunes (`<NumeroRacional>`, `<Expresion>`,
 * `<ErrorAmable>`, `<EstadoVacio>`) con datos reales de
 * `src/dominio/__fixtures__/casos.ts`, para revisarlos visualmente antes de
 * integrarlos en las pantallas reales. No es parte del producto: llama a
 * `notFound()` en producción para no quedar accesible en el build final.
 */

import Link from "next/link";
import { notFound } from "next/navigation";

import { C1, C5 } from "@/dominio/__fixtures__/casos";
import type { Fraccion } from "@/dominio/aritmetica/fraccion";
import { parsearFraccion } from "@/dominio/aritmetica/parseo";
import { generarTokensExpresion, generarTokensRestriccion, type FormatoNumero } from "@/dominio/modelo/formato";
import type { Variable } from "@/dominio/modelo/tipos";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expresion } from "@/components/comunes/expresion";
import { ErrorAmable } from "@/components/comunes/error-amable";
import { EstadoVacio } from "@/components/comunes/estado-vacio";
import { NumeroRacional } from "@/components/comunes/numero-racional";

/** Los fixtures (`ModeloCaso`) sólo dan nombres de variable; `formato.ts` sólo necesita `.nombre`. */
function variablesDe(nombres: string[]): Variable[] {
  return nombres.map((nombre) => ({ nombre, etiqueta: nombre, definicion: nombre }));
}

const FORMATOS: FormatoNumero[] = ["fraccion", "decimal"];

export default function ComponentesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const variablesC1 = variablesDe(C1.modelo.variables);
  const variablesC5 = variablesDe(C5.modelo.variables);

  // Valores de la solución de C1 (docs/08), para <NumeroRacional>.
  const x1 = parsearFraccion(C1.simplex.solucion!.x1!);
  const x2 = parsearFraccion(C1.simplex.solucion!.x2!);
  const z = parsearFraccion(C1.simplex.z!);
  const entero = parsearFraccion("6");
  const negativa = parsearFraccion("-23/4");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted-foreground">Página interna de desarrollo</p>
        <h1 className="text-2xl font-bold">Componentes comunes</h1>
        <p className="max-w-[72ch] text-sm text-muted-foreground">
          Vista de revisión de <code>NumeroRacional</code>, <code>Expresion</code>,{" "}
          <code>ErrorAmable</code> y <code>EstadoVacio</code>, con datos del caso C1 (clase, ejemplo
          principal) y C5 (Gran M) de <code>docs/08-casos-de-prueba.md</code>. No disponible en producción.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>NumeroRacional</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DemoNumero titulo="x₁ = 31/4 (no entero)" valor={x1} />
            <DemoNumero titulo="Z = 57/2 (no entero)" valor={z} />
            <DemoNumero titulo="6 (entero)" valor={entero} />
            <DemoNumero titulo="−23/4 (negativo)" valor={negativa} />
          </div>
          <p className="text-sm text-muted-foreground">
            En una tabla, los números van en modo <strong>apilada</strong>; en texto corrido,{" "}
            <strong>en línea</strong> — ej.: la solución es x₁ = <NumeroRacional valor={x1} modo="linea" />,
            x₂ = <NumeroRacional valor={x2} modo="linea" />.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expresion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {FORMATOS.map((formato) => (
            <div key={formato} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {formato === "fraccion" ? "Fracción" : "Decimal"}
              </p>
              <p className="text-base">
                Maximizar Z = <Expresion tokens={generarTokensExpresion(C1.modelo.objetivo.coeficientes, variablesC1, formato)} />
              </p>
              <ul className="flex flex-col gap-1 text-base">
                {C1.modelo.restricciones.map((restriccion) => (
                  <li key={restriccion.numero}>
                    <Expresion
                      tokens={generarTokensRestriccion(
                        restriccion.coeficientes,
                        variablesC1,
                        restriccion.relacion,
                        restriccion.limite,
                        formato,
                      )}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-md border border-border p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Minimizar (C5, Gran M)
            </p>
            <p className="text-base">
              Minimizar Z ={" "}
              <Expresion tokens={generarTokensExpresion(C5.modelo.objetivo.coeficientes, variablesC5, "fraccion")} />
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ErrorAmable</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorAmable
            mensaje="El enlace que abriste no tiene un problema completo. Puede que esté incompleto o que lo hayas copiado mal."
            accion={<Button size="sm" nativeButton={false} render={<Link href="/">Ir al inicio</Link>} />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>EstadoVacio</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadoVacio
            titulo="Todavía no resolviste ningún problema"
            descripcion="Cuando resuelvas uno, vas a poder encontrarlo acá para volver a verlo."
            accion={<Button size="sm" nativeButton={false} render={<Link href="/">Empezar con preguntas</Link>} />}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function DemoNumero({ titulo, valor }: { titulo: string; valor: Fraccion }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Apilada</dt>
        <dd>
          <NumeroRacional valor={valor} modo="apilada" />
        </dd>
        <dt className="text-muted-foreground">En línea</dt>
        <dd>
          <NumeroRacional valor={valor} modo="linea" />
        </dd>
        <dt className="text-muted-foreground">Decimal</dt>
        <dd>
          <NumeroRacional valor={valor} modo="decimal" />
        </dd>
      </dl>
    </div>
  );
}
