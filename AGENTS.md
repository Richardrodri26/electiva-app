# AGENTS.md — Solucionador de Programación Lineal (web)

Guía de entrada para cualquier agente que implemente esta aplicación. **Léela completa antes de escribir código.**

## Qué es

Aplicación web (Next.js) para la materia **Electiva: Investigación de Operaciones (UPCA)**. Evoluciona el CLI
`../console-program` (formulador de modelos de programación lineal en lenguaje cotidiano) y agrega lo visto
después en clase:

1. **Formular** un modelo (asistente en lenguaje cotidiano, igual que el CLI, o editor técnico directo).
2. **Resolver por el método gráfico** (solo con 2 variables).
3. **Resolver por el método Simplex tabular** con Gran M (≤, ≥ y =), mostrando cada tabla e iteración
   con el mismo vocabulario y reglas de la clase.

Todo corre en el navegador. No hay backend ni base de datos.

## Orden de lectura

| # | Documento | Para qué |
|---|-----------|----------|
| 1 | `docs/01-producto.md` | Alcance, decisiones tomadas, historias de usuario |
| 2 | `docs/02-arquitectura.md` | Stack, estructura de carpetas, manejo de estado |
| 3 | `docs/03-dominio-y-validacion.md` | Tipos, aritmética exacta, esquemas Zod, serialización en URL |
| 4 | `docs/04-motor-simplex.md` | Especificación exacta del algoritmo Simplex / Gran M |
| 5 | `docs/05-metodo-grafico.md` | Especificación del método gráfico y su gráfica |
| 6 | `docs/06-ux-ui.md` | Pantallas, flujos, componentes, estilo visual, accesibilidad |
| 7 | `docs/07-plan-de-implementacion.md` | Fases, tareas, dependencias y criterios de aceptación |
| 8 | `docs/08-casos-de-prueba.md` | Casos con resultados verificados (fixtures) |

Referencia obligatoria del comportamiento original: `../console-program/src/` (sobre todo `flow/*.ts`,
`validation.ts` y `formatter.ts`).

## Stack (no cambiar sin consultar)

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript `strict`
- Tailwind CSS v4 + **shadcn/ui**
- **Zod 4** · **TanStack Form v1** · **TanStack Query v5** · **TanStack Table v8** · **TanStack Charts v1** (`@tanstack/charts`)
- **nuqs v2** (estado en la URL)
- pnpm · Vitest · Playwright · Node ≥ 20.9

Instala siempre la última versión estable con `pnpm add <paquete>` y **consulta la documentación oficial
actual** antes de usar una API. TanStack Charts es reciente: no asumas su API de memoria
(ver `docs/05-metodo-grafico.md` §5).

## Reglas de oro

1. **El dominio es puro.** `src/dominio/**` no importa React, Next ni librerías de UI. Solo TypeScript y Zod.
2. **Cero `number` en los cálculos del solver.** Toda la aritmética usa la clase `Fraccion` (bigint) y
   `ValorM`. `number` solo existe en la capa de presentación (gráfica, formato decimal).
3. **Zod es la única fuente de validación.** Formularios, parser de URL e importaciones usan los mismos esquemas.
4. **La URL es la fuente de verdad del modelo resuelto** (`?m=`), vía un parser nuqs validado con Zod.
5. **Todo texto visible está en español.** El asistente **nunca** usa vocabulario técnico
   ("coeficiente", "lado derecho", "función objetivo", "restricción"): igual que el CLI.
6. **Fidelidad a la clase.** Reglas de entrada/salida, nombres de variables (`S`, `A`), forma canónica
   `z − cx = 0` y presentación en fracciones deben coincidir con `docs/04-motor-simplex.md`.
7. **No agregues dependencias** fuera del stack sin justificarlo en el PR. Ya están decididas:
   `next-themes`, `lucide-react`, `sonner` (vía shadcn). Nada de librerías de fracciones, LP o 3D.
8. **Si una especificación es ambigua o contradictoria, detente y pregunta.** No inventes comportamiento.

## Comandos

```bash
pnpm dev          # desarrollo
pnpm build        # build de producción
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (unitarios del dominio)
pnpm test:e2e     # Playwright
```

## Definición de terminado (toda tarea)

- `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan.
- Lógica nueva del dominio con pruebas unitarias; los casos de `docs/08-casos-de-prueba.md` que apliquen pasan.
- UI nueva revisada en móvil (375 px) y escritorio (1280 px), en tema claro y oscuro, navegable con teclado.
- Sin `any`, sin `@ts-ignore`, sin `console.log`.
- Criterios de aceptación de la tarea en `docs/07-plan-de-implementacion.md` cumplidos.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
