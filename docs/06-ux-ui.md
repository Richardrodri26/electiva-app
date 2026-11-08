# 06 · Experiencia de usuario e interfaz

## 1. Dirección visual: "cuaderno de clase"

La app es la versión limpia de lo que un estudiante hace a mano en clase: plantea el modelo, grafica en
**papel milimetrado** y resuelve la **tabla Simplex resaltando** la fila y la columna pivote. Ese es el
lenguaje visual. El elemento memorable es uno solo: **el resaltador sobre la tabla Simplex**. Todo lo demás
es sobrio y disciplinado.

- Modo claro = **papel**; modo oscuro = **pizarra**. No son una inversión de colores: cada uno tiene su paleta.
- Las expresiones matemáticas se componen como en un libro de texto: variables en *itálica serif* con
  subíndice (x₁, S₂, A₁), no en monoespaciada.
- La cuadrícula milimetrada aparece **solo** detrás de la gráfica del método gráfico, nunca como fondo decorativo.

### 1.1 Paleta (tokens shadcn en `globals.css`)

| Token | Papel (claro) | Pizarra (oscuro) | Uso |
|-------|---------------|------------------|-----|
| `--background` | `#F7F9FC` | `#16222A` | fondo |
| `--foreground` | `#1F2A44` | `#E9EEF2` (tiza) | texto |
| `--primary` | `#2457C5` (tinta azul) | `#8FB3FF` | acciones, región factible |
| `--resaltador` | `#FFE066` (al 55 %) | `#E8C547` (al 30 %) | fila/columna pivote |
| `--entra` | `#1F8A5B` | `#5FD3A0` | variable de entrada, óptimo |
| `--sale` | `#C8372D` (lápiz rojo) | `#FF8A80` | variable de salida, errores |
| `--cuadricula` | `#DCE3EC` | `#2A3A45` | papel milimetrado |
| `--chart-1…6` | categóricos para restricciones | variantes claras | rectas R1…R6 |

- Contraste AA mínimo para todo texto (verificar con herramienta; ajustar tonos si alguno falla).
- **Nunca solo color**: la columna que entra lleva el ícono ↓ y el texto "entra"; la fila que sale, "sale";
  el pivote, un borde doble además del resaltado. Los estados usan ícono + texto.
- `--radius`: 10 px en contenedores, 6 px en controles, 0 en celdas de tabla (son una cuadrícula).
- Sin sombras decorativas; separar con espacio y bordes de 1 px `--border`.

### 1.2 Tipografía (`next/font/google`)

| Rol | Familia | Notas |
|-----|---------|-------|
| Interfaz y texto | **Atkinson Hyperlegible Next** | diseñada para legibilidad; pesos 400/600/700 |
| Matemática (variables, expresiones, fracciones) | **STIX Two Text** | itálica para variables, regular para números |

- Números en tablas: `font-variant-numeric: tabular-nums` y alineados a la derecha.
- Fracciones en tablas: componente `<NumeroRacional>` que muestra `31/4` apilado (numerador sobre
  denominador, tamaño 0,8 em) en tablas y en línea (`31/4`) en texto corrido.
- Escala: 14 · 16 (base) · 20 · 25 · 31 px. Títulos en peso 700, sentence case. Interlineado 1,5 en texto, 1,2 en títulos.
- Ancho de línea ≤ 72 caracteres en textos explicativos.

### 1.3 Movimiento

Un solo momento orquestado: al avanzar de iteración en el Simplex, el resaltador "barre" la columna
pivote y luego la fila pivote (≈ 400 ms en total) y el elemento pivote recibe su borde. Con
`prefers-reduced-motion` aparece sin animación. No hay animaciones de entrada en tarjetas ni hovers llamativos.

## 2. Mapa de pantallas

```
/ (Inicio)
├─ /modelo/asistente?paso=1..5     → al generar →  /resolver?m=…&vista=modelo
├─ /modelo/editor[?m=…]            → al resolver → /resolver?m=…&vista=simplex|grafico
└─ /resolver?m=…&vista=modelo|grafico|simplex|interpretacion&iter=n&num=fraccion|decimal
   ├─ "Editar en el editor"   → /modelo/editor?m=…
   └─ "Nuevo modelo"          → /
```

Encabezado global: nombre de la app (enlace a Inicio) · botón Historial (abre `Sheet`) · toggle de tema.

## 3. Pantallas

### 3.1 Inicio

```
┌──────────────────────────────────────────────────────────────┐
│ Programación lineal, paso a paso               [Historial] [◐] │
│                                                              │
│ Plantea tu problema y resuélvelo por el método gráfico      │
│ o por Simplex, viendo cada tabla como en clase.              │
│                                                              │
│ ┌ Tengo una situación real ───────┐ ┌ Ya tengo el modelo ────┐│
│ │ Te guiamos con preguntas        │ │ Escribe la función      ││
│ │ sencillas, sin términos técnicos│ │ objetivo y restricciones││
│ │ [Empezar con preguntas]         │ │ [Abrir editor]          ││
│ └─────────────────────────────────┘ └─────────────────────────┘│
│                                                              │
│ Ejercicios de clase                                          │
│  max Z = 3x₁ + 2x₂  ·  3 restricciones   [Resolver]          │
│  max Z = 3x₁ + 5x₂  ·  2 restricciones   [Resolver]          │
│  …                                                           │
│ Recientes (si hay historial): 3 últimos  [Ver todo]          │
└──────────────────────────────────────────────────────────────┘
```

- Los ejercicios se muestran por su función objetivo (componente `<Expresion>`), no por un título inventado.
- Estado vacío del historial: no se muestra la sección.

### 3.2 Asistente (port del CLI)

```
┌──────────────────────────────────────────────────────────────┐
│ 1 Qué decides ─ 2 Qué quieres lograr ─ 3 Limitaciones ─ 4 Cantidades ─ 5 Revisar │
│                                                              │
│ ¿Qué deseas determinar?                                      │
│ ( ) Productos ( ) Servicios ( ) Trabajos o proyectos …       │
│ ¿Cuántas opciones quieres comparar?   [ 2 ▾ ]                │
│ Nombre de la opción 1  [ Mesas        ]                      │
│ Nombre de la opción 2  [ Sillas       ]                      │
│ ¿En qué unidad se miden?  [ Unidades ▾ ]                     │
│                                                              │
│                                   [Atrás]  [Continuar]       │
└──────────────────────────────────────────────────────────────┘
```

- El stepper sí es una secuencia: numerar está justificado. Paso actual en `?paso=`; no se puede saltar a
  un paso posterior con datos inválidos (se valida el paso actual al continuar).
- Preguntas, opciones y orden **idénticos al CLI** (`flow/*.ts`), con estos ajustes de formulario:
  - Menús de pocas opciones → `RadioGroup` en tarjetas seleccionables; cantidades → `Select`.
  - "Otra" (unidad o tipo de limitación) muestra un `Input` de texto en línea.
  - Paso 2: tras elegir la meta, una fila por opción: *"¿Cuánto aporta o cuesta cada Mesa?"*
  - Paso 3: cada limitación es un bloque plegable (`Collapsible`/acordeón) con título "Limitación 1 · Horas";
    botón "Agregar limitación" (2 a 6).
- Paso 5 "Revisar": muestra el resumen (formato del CLI, ya en notación matemática) y tres acciones:
  **"Resolver modelo"** (primaria), **"Corregir…"** (`DropdownMenu` con las 5 secciones del CLI) y
  **"Cancelar"** (diálogo de confirmación; borra el borrador).
  - Corregir "Las opciones que se están comparando" muestra el aviso del CLI y lleva al paso 1 marcando
    pasos 2 y 3 como pendientes.
- El borrador persiste en `localStorage`; al volver: banner *"Tienes un modelo sin terminar"* con
  [Continuar] [Descartar].
- Lenguaje: **sin** "coeficiente", "restricción", "función objetivo", "variable", "maximizar".

### 3.3 Editor directo

```
┌──────────────────────────────────────────────────────────────┐
│ Editor del modelo                   [Cargar ejemplo ▾]        │
│ Objetivo  (•) Maximizar ( ) Minimizar                        │
│                                                              │
│           x₁      x₂      [+ variable]                       │
│ Z =     [ 3 ]   [ 2 ]                                        │
│ R1      [ 2 ]   [ 5 ]   [≤ ▾] [ 35 ]  Nombre [Horas   ] [×]  │
│ R2      [-3 ]   [ 2 ]   [≥ ▾] [-18 ]  Nombre [         ] [×]  │
│ R3      [ 2 ]   [ 4 ]   [≤ ▾] [ 26 ]  Nombre [         ] [×]  │
│ [+ restricción]                                              │
│ x₁, x₂ ≥ 0   ☐ Solo valores enteros                          │
│                                                              │
│ Vista previa:  max Z = 3x₁ + 2x₂                             │
│                2x₁ + 5x₂ ≤ 35 …                              │
│                       [Resolver con Simplex] [Método gráfico] │
└──────────────────────────────────────────────────────────────┘
```

- Grilla accesible: cada `Input` con `aria-label` "Coeficiente de x₂ en R1". Navegación con Tab y flechas
  (Enter baja a la fila siguiente).
- Vista previa en vivo con `<Expresion>` (respeta toggle fracción/decimal).
- "Método gráfico" deshabilitado si hay ≠ 2 variables, con tooltip explicativo.
- Nombres de restricción opcionales (por defecto "Restricción n").
- Columna de variable: encabezado editable (etiqueta) en un `Popover`.
- En móvil la grilla se convierte en tarjetas por fila (objetivo, R1, R2…), cada una con sus campos apilados.

### 3.4 Resultados

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Editar   max Z = 3x₁ + 2x₂             [Fracción|Decimal] [Copiar enlace] [⋯] │
├───────────────┬──────────────────────────────────────────────────────┤
│ Modelo         │ [Modelo] [Método gráfico] [Simplex] [Interpretación] │
│ (sticky)       │                                                      │
│ max Z = …      │  (contenido de la pestaña)                           │
│ s.a.           │                                                      │
│ R1 2x₁+5x₂≤35  │                                                      │
│ …              │                                                      │
│ ✓ Óptimo       │                                                      │
│ Z = 57/2       │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

- Columna izquierda (≥ 1024 px): modelo compacto + estado + Z, siempre visible. En móvil se convierte en
  un resumen plegable arriba.
- Pestañas sincronizadas con `?vista=`. Default: `simplex` si viene del editor con 3+ variables; `grafico` si
  tiene 2 variables y se pulsó "Método gráfico"; `modelo` desde el asistente.
- Menú `⋯`: Copiar como texto · Imprimir · Guardar con nombre (historial).

#### Pestaña Simplex

```
Preparación ▸ (plegable) 1 Normalizar · 2 Forma estándar · 3 Forma canónica · 4 Ajuste de M
Iteraciones:  (0)───(1)───(2✓)          [‹ Anterior] [Siguiente ›]

 Tabla 1                                    entra ↓
 ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐
 │ Base │  x₁  │  x₂  │  S₁  │  S₂  │  S₃  │  R   │ Razón  │
 ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤
 │  S₁  │  0   │ 19/3 │  1   │ -2/3 │  0   │  23  │ 69/19  │
 │  x₁  │  1   │ -2/3 │  0   │ 1/3  │  0   │  6   │   —    │  ← no participa (≤ 0)
 │  S₃  │  0   │ 16/3 │  0   │ -2/3 │  1   │  14  │ 21/8 ◂ │  sale
 ├──────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤
 │  Z   │  0   │  -4  │  0   │  1   │  0   │  18  │        │
 └──────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┘
 Entra x₂ (−4 es el más negativo) · Sale S₃ (razón menor 21/8) · Pivote 16/3
 Operaciones ▸  Fila x₂ ← Fila S₃ ÷ 16/3 · Fila S₁ ← Fila S₁ − (19/3)·(nueva fila x₂) · …
 [Ver cálculo celda a celda]
```

- Tabla con **TanStack Table**: columnas dinámicas desde `resultado.columnas`; columna Base fija (sticky) al
  hacer scroll horizontal; encabezados con tooltip ("S₁: holgura de la restricción 1 — lo que sobra").
- Resaltado: columna pivote y fila pivote con `--resaltador`; elemento pivote con borde doble; fila Z separada
  por borde superior grueso; celdas con M muestran el `ValorM` formateado.
- Bajo la tabla, la **explicación** de la decisión en una frase con el vocabulario de la clase
  ("condición de optimalidad", "variable de entrada", "variable de salida", "elemento pivote").
- Tabla final: badge del estado y la solución; si hay alternativos, botón "Ver solución alternativa".
- Atajos: ← / → cambian de iteración cuando el foco está en el área de la tabla.

#### Pestaña Método gráfico

Ver `05-metodo-grafico.md` §4. Gráfica a la izquierda (≈ 60 %), tabla de vértices y resultado a la derecha.

#### Pestaña Interpretación

Lista de frases de `interpretar.ts` agrupadas en "Qué conviene hacer", "Cómo quedan tus recursos" y
"Resultado". Avisos (`no_entera`, etc.) como `Alert`.

## 4. Estados y mensajes

| Situación | Presentación |
|-----------|--------------|
| Óptimo único | `Alert` verde: "Solución óptima: Z = 57/2 con x₁ = 31/4 y x₂ = 21/8." |
| Óptimos alternativos | `Alert` azul: "Hay más de una solución óptima con Z = 16." + ver alternativa |
| No acotado | `Alert` ámbar: "Z puede crecer sin límite: falta alguna limitación. Revisa tus restricciones." |
| Infactible | `Alert` rojo: "Ningún punto cumple todas las restricciones a la vez. Revisa los límites de R1 y R2." (nombrar las que tenían artificiales > 0) |
| Límite de iteraciones | `Alert` rojo con explicación de posible ciclo |
| URL inválida | Página `ErrorAmable`: "Este enlace no contiene un modelo válido." [Abrir editor] [Ir al inicio] |
| Cargando | `Skeleton` con la forma de la tabla (casi nunca visible) |

Copys: sentence case, verbos concretos ("Resolver modelo", "Copiar enlace" → toast "Enlace copiado"),
sin disculpas en errores, sin "→" en botones, sin etiquetas en mayúsculas.

## 5. Accesibilidad y responsive

- Navegación completa con teclado; foco visible (anillo `--primary` de 2 px con offset).
- `aria-live="polite"` para el estado del resultado y el cambio de iteración.
- Tablas con `<th scope>` y `caption` ("Tabla 2 de 3, iteración 2").
- Objetivos táctiles ≥ 44 px. Probar en 375, 768, 1024 y 1440 px.
- Impresión: oculta navegación y controles; imprime modelo, todas las tablas Simplex y la gráfica.
