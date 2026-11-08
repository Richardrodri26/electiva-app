# 02 · Arquitectura

## 1. Principios

- **Capas**: `dominio` (puro) → `features` (React + estado) → `app` (rutas) / `components/ui` (shadcn).
- El dominio nunca depende de la UI. La UI nunca reimplementa lógica del dominio.
- Estado del modelo resuelto en la **URL**; estado de edición en **TanStack Form**; resultados derivados vía **TanStack Query**.

## 2. Estructura de carpetas

```
web-app/
├─ AGENTS.md
├─ docs/
├─ public/
│  └─ ejemplos.json                 # ejemplos de clase (ver 08-casos-de-prueba.md)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # Providers, fuentes, tema, Toaster
│  │  ├─ page.tsx                   # Inicio
│  │  ├─ modelo/
│  │  │  ├─ asistente/page.tsx      # Asistente (?paso=1..5)
│  │  │  └─ editor/page.tsx         # Editor directo (?m= opcional para editar)
│  │  ├─ resolver/page.tsx          # Resultados (?m=&vista=&iter=&num=)
│  │  └─ not-found.tsx
│  ├─ components/
│  │  ├─ ui/                        # generados por shadcn (no editar a mano salvo theming)
│  │  └─ comunes/                   # Expresion, NumeroRacional, EstadoVacio, ErrorAmable…
│  ├─ dominio/                      # PURO: sin React
│  │  ├─ aritmetica/
│  │  │  ├─ fraccion.ts             # clase Fraccion (bigint)
│  │  │  ├─ valor-m.ts              # a + bM
│  │  │  └─ parseo.ts               # texto → Fraccion (sin pasar por float)
│  │  ├─ modelo/
│  │  │  ├─ tipos.ts
│  │  │  ├─ esquemas.ts             # Zod
│  │  │  ├─ catalogos.ts            # metas, categorías, unidades, tipos de limitación (del CLI)
│  │  │  ├─ formato.ts              # port de formatter.ts (texto plano y tokens para UI)
│  │  │  └─ serializacion.ts        # modelo ⇄ string URL
│  │  ├─ simplex/
│  │  │  ├─ tipos.ts
│  │  │  ├─ estandarizar.ts         # normalización + forma estándar
│  │  │  ├─ resolver.ts             # Gran M tabular, produce traza completa
│  │  │  └─ interpretar.ts          # solución → frases en lenguaje cotidiano
│  │  └─ grafico/
│  │     ├─ tipos.ts
│  │     └─ resolver.ts             # vértices, región, óptimo, puntos enteros
│  ├─ features/
│  │  ├─ asistente/                 # pasos del asistente (TanStack Form)
│  │  ├─ editor/                    # grilla del editor directo (TanStack Form)
│  │  ├─ resultados/
│  │  │  ├─ vista-modelo/
│  │  │  ├─ vista-grafico/          # TanStack Charts + TanStack Table (vértices)
│  │  │  ├─ vista-simplex/          # TanStack Table (tablas) + stepper
│  │  │  └─ vista-interpretacion/
│  │  ├─ historial/                 # Query + localStorage
│  │  └─ ejemplos/                  # Query sobre /ejemplos.json
│  ├─ lib/
│  │  ├─ query-client.ts
│  │  ├─ url-state.ts               # parsers nuqs compartidos
│  │  └─ almacenamiento.ts          # wrapper seguro de localStorage (try/catch)
│  └─ providers.tsx                 # QueryClientProvider + NuqsAdapter + ThemeProvider
├─ tests/
│  └─ e2e/                          # Playwright
└─ vitest.config.ts                 # pruebas junto al código: *.test.ts
```

## 3. Manejo de estado

| Estado | Dónde vive | Herramienta |
|--------|-----------|-------------|
| Modelo que se está resolviendo | URL `?m=` | nuqs (`createParser` + Zod) |
| Vista activa (`modelo`/`grafico`/`simplex`/`interpretacion`) | URL `?vista=` | nuqs `parseAsStringLiteral` |
| Iteración visible del Simplex | URL `?iter=` | nuqs `parseAsInteger` |
| Formato numérico (`fraccion`/`decimal`) | URL `?num=` | nuqs `parseAsStringLiteral`, default `fraccion` |
| Paso del asistente | URL `?paso=` | nuqs `parseAsInteger` |
| Borrador del asistente/editor | Memoria + `localStorage` (`pl:borrador:asistente`, `pl:borrador:editor`) | TanStack Form (persistir con debounce 500 ms) |
| Resultado del Simplex / gráfico | Caché de Query (derivado del modelo) | TanStack Query |
| Ejemplos de clase | `/ejemplos.json` | TanStack Query |
| Historial | `localStorage` (`pl:historial`) | TanStack Query (`useQuery` + `useMutation`) |
| Tema | `localStorage` | next-themes |

### 3.1 nuqs

- `NuqsAdapter` de `nuqs/adapters/next/app` en `providers.tsx`.
- Parsers centralizados en `src/lib/url-state.ts` para que todas las páginas usen las mismas claves.
- `?m=` usa `history: 'push'` al llegar desde el asistente/editor; `?vista=`, `?iter=` y `?num=` usan `history: 'replace'`.
- Las páginas que leen `searchParams` en cliente envuelven el contenido en `<Suspense>` (requisito de Next).

### 3.2 TanStack Query

```ts
// claves
['solucion', 'simplex', hashModelo]
['solucion', 'grafico', hashModelo]
['ejemplos']
['historial']
```

- `queryFn` del solver: `async () => resolverSimplex(modelo)` (el cálculo es síncrono; se envuelve en promesa
  para tener caché, estados de carga/error uniformes y poder moverlo a un Web Worker después sin tocar la UI).
- `staleTime: Infinity`, `gcTime: 10 min`, `retry: false` (el resultado es determinista).
- `hashModelo` = el mismo string serializado de `?m=`.
- Historial: `useMutation` para guardar/renombrar/eliminar con `invalidateQueries(['historial'])`.
- Guardado automático en historial: efecto en la vista de resultados cuando la query de Simplex termina con éxito (deduplicar por `hashModelo`, conservar 20).

### 3.3 TanStack Form

- Un `useForm` por pantalla (asistente completo, editor). Validación con los esquemas Zod de `dominio/modelo/esquemas.ts` (Standard Schema: se pasa el esquema directamente a `validators`).
- Arrays de variables/restricciones con `form.Field` en modo `array` (`pushValue`, `removeValue`).
- Validación `onBlur` por campo + `onSubmit` del formulario completo. Errores bajo cada campo con `aria-describedby`.
- Al enviar: `serializarModelo(modelo)` → `router.push('/resolver?m=…')`.

### 3.4 Rutas y renderizado

- Todas las rutas son estáticas; las páginas con estado son Client Components dentro de un layout de servidor.
- `resolver/page.tsx`: si `?m=` falta o no valida → `ErrorAmable` con botones "Ir al editor" / "Ir al inicio".
- `generateMetadata` simple por ruta (título en español).

## 4. Dependencias

```bash
pnpm create next-app@latest web-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card tabs input label select radio-group toggle-group table badge alert \
  tooltip slider sheet dialog sonner skeleton separator breadcrumb dropdown-menu progress scroll-area form
pnpm add zod @tanstack/react-form @tanstack/react-query @tanstack/react-table @tanstack/charts nuqs next-themes
pnpm add -D vitest @vitest/coverage-v8 @playwright/test @tanstack/react-query-devtools
```

> Si algún componente de shadcn cambió de nombre en la versión actual, usa el equivalente vigente y
> documenta el cambio en el PR.

## 5. Convenciones

- Nombres del dominio en español, coherentes con el CLI (`Variable`, `Restriccion`, `ModeloLineal`, `Sentido`, `Relacion`, `Naturaleza`).
- Archivos en `kebab-case`; componentes en `PascalCase`; hooks `useAlgo`.
- Pruebas unitarias junto al archivo: `fraccion.test.ts`.
- Comentarios y textos en español; identificadores técnicos de librerías en inglés tal cual.
