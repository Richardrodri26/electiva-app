# 07 · Plan de implementación

Cada tarea es un PR independiente. Un agente toma **una** tarea, cumple sus criterios de aceptación y la
"Definición de terminado" de `AGENTS.md`. Las tareas sin dependencia entre sí pueden ir en paralelo.

## Grafo de dependencias

```
F0 ─► F1 ─┬─► F2 (Simplex) ─┬─► F6 (Resultados) ─► F7 (Historial/compartir) ─► F8 (Pulido + e2e)
          ├─► F3 (Gráfico) ─┘          ▲
          ├─► F4 (Editor) ─────────────┤
          └─► F5 (Asistente) ──────────┘
```

---

## F0 · Base del proyecto

**T0.1 Scaffold.** Crear `web-app` con los comandos de `02-arquitectura.md` §4. Scripts `dev`, `build`, `lint`,
`typecheck`, `test`, `test:e2e`. TypeScript `strict` + `noUncheckedIndexedAccess`.
- ✅ `pnpm build` y `pnpm test` (con una prueba trivial) pasan.

**T0.2 Providers y layout.** `providers.tsx` (QueryClient, NuqsAdapter, ThemeProvider), fuentes y tokens de
`06-ux-ui.md` §1, encabezado global, `Toaster`, página 404 en español.
- ✅ Tema claro "papel" y oscuro "pizarra" conmutables; fuentes cargadas con `next/font`.

## F1 · Dominio base (bloquea todo lo demás)

**T1.1 `Fraccion`, `ValorM`, parseo.** Según `03` §1, con pruebas de `03` §6.
- ✅ Cobertura ≥ 95 % en `dominio/aritmetica`.

**T1.2 Tipos, catálogos y esquemas Zod.** Según `03` §2–3. Catálogos copiados del CLI.
- ✅ Mensajes del asistente idénticos al CLI (prueba con tabla de entradas → mensaje).

**T1.3 Formato.** Port de `formatter.ts` con tokens y soporte de negativos/fracciones (`03` §4).
- ✅ `formatearModeloTexto` produce exactamente la salida del CLI para un modelo equivalente.

**T1.4 Serialización y parsers nuqs.** `03` §5 + `lib/url-state.ts`.
- ✅ Ida y vuelta estable para todos los casos de `08`.

**T1.5 Componentes comunes.** `<NumeroRacional>` (fracción apilada/en línea/decimal según `?num=`),
`<Expresion>` (tokens → HTML con subíndices e itálica STIX), `<ErrorAmable>`, `<EstadoVacio>`.
- ✅ Página de prueba interna (solo en desarrollo) que muestra los componentes con datos de `08`.

## F2 · Motor Simplex

**T2.1 Preparación** (`estandarizar.ts`): `04` §2.
**T2.2 Iteración y diagnóstico** (`resolver.ts`): `04` §3–4.
**T2.3 Interpretación** (`interpretar.ts`) y `recorridoSimplex`: `04` §5–6.
- ✅ Todos los casos de `08` pasan con traza exacta (entra, sale, pivote por iteración), solución y Z.
- ✅ Invariantes de `04` §7.

## F3 · Motor gráfico

**T3.1 `resolverGrafico`**: `05` §2, incluidos puntos enteros.
- ✅ Casos de 2 variables de `08` (vértices y estado) + casos de borde de `05` §6.
- ✅ Prueba de coherencia gráfico ↔ Simplex.

## F4 · Editor directo y ejemplos

**T4.1 Ejemplos.** `public/ejemplos.json` con los casos "ejemplo" de `08`; hook `useEjemplos` (Query).
**T4.2 Editor.** Pantalla `06` §3.3 con TanStack Form (arrays dinámicos), validación Zod, vista previa en vivo,
carga de ejemplo y de `?m=` para editar, borrador persistido.
- ✅ Agregar/quitar variables y restricciones conserva los demás valores.
- ✅ Acepta `-3`, `2,5`, `1/3`; rechaza `abc` con mensaje claro.
- ✅ "Resolver" navega a `/resolver?m=…`.

## F5 · Asistente

**T5.1 Pasos 1–4** con las preguntas del CLI (`06` §3.2), validación por paso y `?paso=`.
**T5.2 Revisar y corregir** (paso 5): resumen, "Corregir…" con las 5 secciones y su lógica de recaptura
(`modelBuilder.ts`), cancelar, borrador persistido.
- ✅ Recorrer el asistente con los datos de la "Prueba 1" del informe del CLI produce el mismo modelo.
- ✅ Ningún texto del asistente contiene: coeficiente, restricción, función objetivo, variable, maximizar, minimizar.

## F6 · Resultados (requiere F2, F3 y F4 o F5)

**T6.1 Layout de resultados**: columna de modelo, pestañas con `?vista=`, toggle `?num=`, error de URL inválida.
**T6.2 Pestaña Modelo**: notación matemática completa + "Copiar como texto".
**T6.3 Pestaña Simplex**: preparación plegable, stepper con `?iter=`, tabla con TanStack Table, resaltado
y animación del resaltador, explicación, operaciones, detalle celda a celda, estados finales, alternativa.
- ✅ El caso "Clase · ejemplo principal" se ve igual que las diapositivas 10–29 (mismas tablas y decisiones).
**T6.4 Pestaña Método gráfico**: `05` §4–5 con TanStack Charts + tabla de vértices enlazada + recta de nivel + recorrido.
- ✅ Si TanStack Charts no permite algo de `05` §5, la tarea se detiene y se consulta.
**T6.5 Pestaña Interpretación**: `04` §5 + avisos.

## F7 · Historial y compartir

**T7.1 Historial** (Query + `localStorage`): guardar automáticamente al resolver, `Sheet` con lista,
renombrar, eliminar, abrir. Máximo 20, deduplicado por `hashModelo`. Tolerante a `localStorage` no disponible.
**T7.2 Compartir/exportar**: copiar enlace (toast "Enlace copiado"), copiar como texto, CSS de impresión.

## F8 · Pulido

**T8.1 Accesibilidad y responsive**: checklist de `06` §5; Lighthouse ≥ 90 (a11y y buenas prácticas).
**T8.2 Pruebas e2e (Playwright)**:
1. Asistente completo → resultados → Interpretación muestra frases esperadas.
2. Editor con el ejemplo principal → Simplex → navegar a la iteración 2 → recargar → sigue en la iteración 2.
3. Ejemplo de 2 variables → Método gráfico → la tabla de vértices tiene el óptimo correcto.
4. Caso infactible y no acotado → mensajes correctos.
5. Enlace corrupto → `ErrorAmable`.
**T8.3 README** del proyecto web (instalación, comandos, estructura) en español.
