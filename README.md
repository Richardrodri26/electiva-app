# Solucionador de Programación Lineal

Aplicación web para la materia **Electiva: Investigación de Operaciones (UPCA)**. Evoluciona el CLI
`../console-program` (formulador de modelos en lenguaje cotidiano) y permite:

1. **Formular** un modelo con un asistente en lenguaje cotidiano o con un editor técnico directo.
2. **Resolver por el método gráfico** (solo con 2 variables).
3. **Resolver por el método Simplex tabular** con Gran M (≤, ≥ y =), mostrando cada tabla e iteración con
   el vocabulario y las reglas vistas en clase.

Todo corre en el navegador: no hay backend ni base de datos. Los cálculos usan aritmética exacta con
fracciones, sin errores de redondeo.

## Requisitos

- Node.js 20.9 o superior
- [pnpm](https://pnpm.io) 11

## Instalación

```bash
pnpm install
pnpm dev
```

La aplicación queda disponible en <http://localhost:3000>.

## Comandos

| Comando          | Qué hace                                         |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Servidor de desarrollo                           |
| `pnpm build`     | Build de producción                              |
| `pnpm start`     | Sirve el build de producción                     |
| `pnpm lint`      | ESLint                                           |
| `pnpm typecheck` | Verificación de tipos (`tsc --noEmit`)           |
| `pnpm test`      | Pruebas unitarias del dominio y la UI (Vitest)   |
| `pnpm test:e2e`  | Pruebas de extremo a extremo (Playwright)        |

## Pantallas

| Ruta                | Contenido                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `/`                 | Inicio: asistente, editor, ejercicios de clase y modelos recientes     |
| `/modelo/asistente` | Asistente en lenguaje cotidiano (5 pasos, `?paso=1..5`)                |
| `/modelo/editor`    | Editor técnico directo (acepta `?m=` para precargar un modelo)         |
| `/resolver`         | Resultados: pestañas Modelo, Método gráfico, Simplex e Interpretación  |

El modelo resuelto vive en la URL (`?m=`), así que cualquier enlace se puede compartir. Otros parámetros:
`vista` (pestaña), `iter` (tabla del Simplex) y `num` (fracción o decimal). Desde el menú "⋯" se puede copiar
el modelo como texto, imprimir (modelo, todas las tablas y la gráfica) y guardar con nombre en el historial,
que se almacena en el navegador.

## Estructura

```
src/
├─ app/                 Rutas de Next.js (App Router); /dev/* son páginas internas de revisión
├─ components/          Encabezado, componentes comunes y componentes de shadcn/ui
├─ dominio/             Núcleo puro en TypeScript + Zod (sin React ni Next)
│  ├─ aritmetica/       Fraccion (bigint) y ValorM (Gran M)
│  ├─ modelo/           Tipos, esquemas Zod, formato de texto, serialización en URL
│  ├─ simplex/          Motor Simplex tabular con Gran M e interpretación de resultados
│  └─ grafico/          Motor del método gráfico (región factible y vértices)
├─ features/            Una carpeta por funcionalidad (asistente, editor, resultados, historial, inicio, ejemplos)
└─ lib/                 Utilidades y estado de la URL (nuqs)
public/ejemplos.json    Ejercicios de clase precargados
docs/                   Especificación completa del producto (leer en orden 01 → 08)
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS v4 + shadcn/ui (Base UI) · Zod 4 ·
TanStack Form, Query, Table y Charts · nuqs · Vitest · Playwright.

## Documentación

La especificación está en `docs/`: producto, arquitectura, dominio y validación, motor Simplex, método
gráfico, UX/UI, plan de implementación y casos de prueba verificados. `AGENTS.md` resume las reglas del
proyecto (por ejemplo: el dominio es puro, cero `number` en los cálculos del solver y todo el texto visible
en español) y `PROGRESS.md` registra el estado de la implementación.
