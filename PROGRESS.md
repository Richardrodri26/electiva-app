# PROGRESS.md — Estado de la implementación

> **Este archivo es un hand-off entre sesiones de agente, no una especificación.** La especificación real
> sigue siendo `AGENTS.md` + `docs/01..08`. Este documento existe para que un agente nuevo, sin memoria de
> las sesiones anteriores, pueda retomar el trabajo sin tener que re-descubrir todo desde cero.
>
> Estado al cerrar esta sesión: 414 tests unitarios pasando (8 skipped, esperados) y 16 E2E de Playwright
> pasando (`pnpm test:e2e`). `pnpm lint` y `pnpm typecheck` sin errores. **Nunca se corrió `pnpm build`**
> (regla global del usuario: "Never build after changes" — no la rompas).

## Cómo se trabajó (para que el agente nuevo mantenga el estilo)

- Un orquestador coordina; **todo el código lo escriben subagentes delegados**, cada uno con contexto
  autocontenido (rutas exactas, qué leer, qué decisiones ya están tomadas, qué no tocar).
- Asignación de modelo: tareas de análisis/coordinación/revisión → Opus. Implementación estándar → Sonnet.
  Tareas mecánicas/repetitivas → Haiku.
- Cada tarea termina con: `pnpm lint && pnpm typecheck && pnpm test` (nunca build), verificación visual real
  en navegador cuando hay UI (no alcanza con que pasen los tests — ya aparecieron bugs reales, como loops de
  render infinitos y animaciones rotas, que solo se ven en el navegador), y un commit con `git add`/`git commit --`
  de **rutas específicas** (nunca `-A` ni `.`).
- Cuando dos tareas corren en paralelo, se les asignan carpetas disjuntas. **Ojo**: comitear en paralelo en el
  mismo working tree es peligroso incluso con carpetas disjuntas (el índice de git es único) — ver gotcha
  correspondiente abajo.
- Ante cualquier ambigüedad real en los docs, la regla del proyecto (AGENTS.md regla #8) es parar y preguntar,
  no inventar. Ya se resolvieron ~20 ambigüedades con el usuario (ver sección de decisiones).

## Qué está hecho (fases completas)

| Fase | Contenido | Estado |
|---|---|---|
| F0 | Scaffold Next.js 16 + stack completo | ✅ |
| F1 | Dominio puro: `Fraccion`/`ValorM`, tipos, catálogos, esquemas Zod, formato, serialización/URL, componentes comunes | ✅ |
| F2 | Motor Simplex (Gran M) — **revisado por Opus contra docs/04, un bug real de correctitud corregido** | ✅ |
| F3 | Motor del método gráfico | ✅ |
| T2.3 | Interpretación de resultados + `recorridoSimplex` | ✅ |
| T3.2 | Prueba de coherencia gráfico↔Simplex (coinciden en los 11 casos de 2 variables) | ✅ |
| T4.1 | Ejemplos precargados (`public/ejemplos.json`) | ✅ |
| T4.2 | Editor técnico directo | ✅ |
| T5.1 | Asistente, pasos 1-4 | ✅ |
| T5.2 | Asistente, paso 5 (revisar y corregir) | ✅ |
| F6 | Resultados: layout + las 4 pestañas (Modelo, Simplex, Gráfico, Interpretación) | ✅ |
| T7.1 | Historial de modelos resueltos (autoguardado, Sheet, renombrar/eliminar) | ✅ |
| T7.2 | Copiar como texto e imprimir (`vista-impresion.tsx`, solo visible al imprimir); recorte de rectas al dominio en la gráfica | ✅ |
| Rutas | Inicio (`/`), `/modelo/asistente` y `/modelo/editor` reales (las `/dev/*` quedan como páginas de revisión) | ✅ |
| T8.2 | E2E Playwright en `tests/e2e/` (los 5 escenarios de docs/07) | ✅ |
| T8.3 | README en español | ✅ |
| T8.1 | Accesibilidad y responsive: Lighthouse 100/100 en las pantallas auditadas, táctiles ≥44px, enlaces reales en vez de `role=button` | ✅ |

## Qué falta

| Tarea | Depende de | Qué es |
|---|---|---|
| (decisión pendiente) | — | "Cancelar" en el asistente solo vuelve al paso 1; `docs/06` dice "vuelve al inicio". |

### Orden sugerido
Solo queda la decisión pendiente de "Cancelar" en el asistente; no queda otra tarea del plan de docs/07.

## Decisiones de arquitectura ya confirmadas con el usuario (no las vuelvas a preguntar)

1. Tono de TODA la app: **"usted"** (nunca "tú" ni voseo). Los textos del asistente son literales del CLI (`../console-program/src/io/prompt.ts` y `flow/*.ts`). Se unificó en toda la UI, incluido el texto de docs/05 ("Use el Simplex.").
2. Resumen del paso 5 del asistente: formato **literal del CLI** (excepción autorizada a la regla de "sin jerga").
3. Git: repo local, sin remoto. Cada tarea es un commit.
4. React Compiler: **activado**.
5. "Copiar como texto" / formato visible: el de `docs/03` §4 (omite términos en cero, signo `−` tipográfico, respeta toggle fracción/decimal) — **no** el literal del CLI.
6. Hash del modelo (`?m=`, historial): **excluye el título**.
7. Normalización de números: se conserva la forma que tipeó el usuario (decimal o fracción), no se canonicaliza.
8. shadcn: componente **`field`** (no `form`, que trae react-hook-form). Librería headless: **Base UI** (no Radix — shadcn ahora pregunta esto, ningún doc lo contemplaba).
9. Límites del asistente: 2 a 6 opciones, 1 a 6 limitaciones.
10. Corregir "las opciones" en el asistente: borra pasos 2-3 igual que el CLI, con el aviso literal.
11. Restricción con todos los aportes en 0: la UI (Zod) la bloquea; el motor del dominio la acepta (para los casos de borde de `docs/05` §6).
12. Historial: guarda **todos** los modelos resueltos, incluidos infactibles/no acotados.
13. Flujo de limitaciones del asistente: botón "Agregar limitación", sin preguntar cantidad de antemano.
14. Mensaje sin jerga para limitación vacía: "La limitación {n} no usa ninguna de las opciones."
15. Etiquetas de variable: literales como las escribe el usuario, sin singularizar/pluralizar.
16. Interpretación de resultados: verbo en futuro ("Se producirán..."), unidad en minúscula, se omite si es "Unidades".
17. Vista inicial al resolver: siempre `vista=simplex`, salvo botón explícito "Resolver con método gráfico".
18. Nombre de restricción vacío en el editor: se completa con el default ("Restricción n") antes de validar.
19. Solución alternativa del Simplex: es una tabla extra al final del stepper (navegable con `?iter=`), no un panel separado. El motor ya expone `resultado.alternativa.{decision,tabla}` con el pivoteo completo.
20. (Corolario de 11) Zod bloquea en UI, el dominio no — confirmado también para el motor gráfico.

## Hallazgos de la revisión del motor Simplex (ya corregidos, no re-abrir)

Una revisión Opus completa contra `docs/04` encontró y se corrigió: un **bug real** (diagnosticaba "no acotado"
cuando el modelo era en realidad infactible, con artificial básica > 0 y ninguna fila participando del
criterio de salida — corregido en `resolver.ts`), avisos `empate` faltantes en los fixtures de C7/C8, y varios
datos que la UI necesitaba (`filaOrigen` en las operaciones de ajuste de M, paso `forma_estandar`, el pivoteo
completo de la solución alternativa). `docs/04` y `docs/08` ya se actualizaron para documentar estos hallazgos
(commit `c126dcd`). Detalle completo en Engram, `topic_key: architecture/motor-simplex`.

## Gotchas de toolchain encontrados (para no perder tiempo re-descubriéndolos)

- **Next.js 16 reescribe `AGENTS.md`** cada vez que corre `next dev` con un agente de IA detectado (bloque
  `<!-- BEGIN:nextjs-agent-rules -->`). Es benigno, nunca se comitea por accidente si seguís la convención de
  `git add <específico>`. Si aparece en `git status`, `git restore AGENTS.md` y listo.
- **`.playwright-mcp/`** (logs/snapshots de verificación visual) ahora está en `.gitignore`. No lo saques de ahí.
- **CSS Modules + Turbopack + Tailwind v4**: un `import estilos from "./x.module.css"` puede resolver a `{}` en
  runtime (el CSS se inyecta pero el export de nombres de clase queda vacío), sin que lint/typecheck/test lo
  detecten. Si una animación/estilo "no se aplica" pero el archivo compila bien, sospechá de esto primero.
  Preferir CSS global con clases prefijadas en vez de CSS Modules si pasa de nuevo.
- **TanStack Table instaló v9**, no v8 como decía originalmente `AGENTS.md` (regla del proyecto: siempre
  instalar la última estable). La API cambió (`useTable`/`tableFeatures` en vez de `useReactTable`/`getCoreRowModel`).
  Si ves código viejo con la API v8, hay que migrarlo.
- **ESLint `react-hooks/set-state-in-effect`** bloquea `setState` síncrono dentro de `useEffect` en este
  proyecto — hay que ajustar el estado durante el render (lazy init / derivar del render anterior) en vez de
  en un efecto.
- **`useSyncExternalStore`**: el `getSnapshot` tiene que ser referencialmente estable (cachear el valor
  parseado y comparar el string crudo) o entra en loop infinito de renders. Pasó una vez en
  `features/asistente/`, solucionado; `src/lib/almacenamiento.ts` tiene `leerCrudo()` específicamente para esto.
- **Comitear en paralelo** en el mismo working tree (dos agentes, cada uno con su propio `git add`+`git commit`)
  puede hacer que un `git commit` sin pathspec explícito se lleve de arrastre archivos que el otro agente tenía
  stageados. Pasó una vez entre los motores Simplex/gráfico, se corrigió sin pérdida de datos. Mitigación:
  pathspec explícito también en `git commit --`, no solo en `git add`.
- **`@tanstack/charts` v1.5.0**: SÍ soporta todo lo que pide `docs/05-metodo-grafico.md` (polígono vía `areaY`
  con envolventes, rectas con `arrow`/`line`, foco enlazado con `onFocusChange`). Tiene un bug real: con un
  dominio de eje Y fijo cuyo máximo es menor al del eje X, el rango en píxeles colapsa — usar dominio
  **compartido** entre ambos ejes (que además es lo que pide la spec para mantener aspecto ≈1:1).
- Hay **dos commits de limpieza** (`ecc5036`, `0a98489`) porque un commit manual del usuario (`783a087`, "first
  commit") metió ~629 mil líneas de `.playwright-mcp/` al historial. Quedó en el historial (no se reescribió,
  decisión del usuario), pero ya no va a volver a pasar.

## Dónde buscar más detalle

Hay memoria persistente en Engram bajo `project: "web-app"` con, entre otros, estos `topic_key` relevantes:
`sdd/web-app-build/plan` (plan completo de 9 fases con todas las tareas detalladas), `sdd/web-app-build/decisions`,
`architecture/motor-simplex`, `architecture/serializacion-modelo`, y varias más por feature. Si tenés acceso a
Engram, `mem_search(project: "web-app")` antes de re-analizar nada. Si no tenés Engram disponible, este archivo
y los commits/tests existentes son la fuente de verdad suficiente para continuar.
