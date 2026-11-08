# 04 · Motor Simplex (Gran M)

Especificación **normativa**. Debe reproducir exactamente lo visto en clase (presentación "Método Simplex"):
mismas reglas de entrada/salida, misma forma canónica, mismos nombres de variables y mismas tablas.
Toda la aritmética con `Fraccion` y `ValorM` (ver `03-dominio-y-validacion.md`).

Archivos: `dominio/simplex/{tipos,estandarizar,resolver,interpretar}.ts`.

## 1. Entrada y salida

```ts
function resolverSimplex(modelo: ModeloLineal, opciones?: { maxIteraciones?: number /* 50 */ }): ResultadoSimplex;
```

```ts
type EstadoSimplex = 'optimo' | 'optimos_alternativos' | 'no_acotado' | 'infactible' | 'limite_iteraciones';

interface ResultadoSimplex {
  estado: EstadoSimplex;
  preparacion: PasoPreparacion[];       // §2, en orden
  columnas: ColumnaTabla[];             // orden fijo de columnas (§2.3)
  tablas: TablaSimplex[];               // tablas[0] = tabla inicial (ya sin M en básicas); luego una por iteración
  solucion?: Solucion;                  // si estado ∈ {optimo, optimos_alternativos}
  solucionAlternativa?: Solucion;       // si estado = optimos_alternativos (§4.3)
  avisos: Aviso[];                      // §4.4
}

interface ColumnaTabla { id: string; tipo: 'decision' | 'holgura' | 'exceso' | 'artificial'; restriccion?: number }

interface TablaSimplex {
  indice: number;                       // 0 = inicial
  base: string[];                       // variable básica de cada fila, ej. ['S1','x1','S3']
  filas: Fraccion[][];                  // coeficientes de cada fila (sin M nunca)
  ladoDerecho: Fraccion[];              // columna "R"
  filaZ: ValorM[];                      // costes reducidos por columna
  valorZ: ValorM;                       // columna R de la fila Z
  decision?: DecisionIteracion;         // ausente en la tabla final
}

interface DecisionIteracion {
  entra: string; columnaPivote: number;
  razones: ({ valor: Fraccion } | { excluida: 'coeficiente_no_positivo' })[]; // una por fila
  sale?: string; filaPivote?: number;   // ausentes si no acotado
  elementoPivote?: Fraccion;
  empateEntrada: boolean; empateSalida: boolean;
  operaciones: OperacionFila[];         // §3.5, para pasar a la tabla siguiente
}

type OperacionFila =
  | { tipo: 'normalizar'; fila: string; divisor: Fraccion }               // "Fila x1 ← Fila S2 ÷ 3"
  | { tipo: 'eliminar'; fila: string; factor: Fraccion | ValorM };        // "Fila S1 ← Fila S1 − (2)·(nueva fila x1)"

interface Solucion { valores: Record<string, Fraccion>; z: Fraccion }     // todas las columnas, no básicas = 0
```

## 2. Preparación (pasos 1–4 de la clase)

Cada paso se registra en `preparacion` para mostrarlo en la UI.

### 2.1 Normalizar lados derechos negativos

Si `limite < 0`: multiplicar la fila por −1 e invertir la relación (`≤ ↔ ≥`; `=` se queda).
Registrar: *"Restricción 2: −3x₁ + 2x₂ ≥ −18 se multiplica por (−1) → 3x₁ − 2x₂ ≤ 18"*.

### 2.2 Variables de holgura, exceso y artificiales

Por cada restricción `i` (numeración del modelo, empezando en 1):

| Relación | Se agrega | Básica inicial |
|----------|-----------|----------------|
| `≤` | `+Sᵢ` (holgura) | `Sᵢ` |
| `≥` | `−Sᵢ` (exceso) `+Aᵢ` (artificial) | `Aᵢ` |
| `=` | `+Aᵢ` (artificial) | `Aᵢ` |

El subíndice es **el número de la restricción** (como en la diapositiva 6: tres ≥ → S₁, S₂, S₃ y A₁, A₂, A₃).

Función objetivo con Gran M (las artificiales van "en contra" del sentido):
- Max: `Z = Σcⱼxⱼ + 0·Sᵢ − M·Aᵢ`
- Min: `Z = Σcⱼxⱼ + 0·Sᵢ + M·Aᵢ`

Registrar la **forma estándar completa** como en la diapositiva 8 (todas las variables en cada ecuación,
con coeficiente 0 donde no aparecen) y la condición `x, S, A ≥ 0`.

### 2.3 Orden de columnas

`x₁…xₙ`, luego todas las `S` en orden de restricción, luego todas las `A` en orden de restricción, luego `R`.

### 2.4 Forma canónica de Z (paso 2 de la clase)

`z − Σcⱼxⱼ ∓ M·Aᵢ = 0`, es decir, fila Z inicial:
- `x_j`: `−cⱼ`; `Sᵢ`: `0`; `Aᵢ`: `+M` (max) o `−M` (min); `R`: `0`.

### 2.5 Eliminar M de las columnas básicas

Las `Aᵢ` básicas deben tener 0 en la fila Z. Para cada fila `i` con `Aᵢ` básica:
`Z ← Z − (coef. de Aᵢ en Z)·Fila i`. Registrar la fila Z antes y después (la UI la muestra como
"Tabla inicial ajustada"). El resultado es `tablas[0]`.

## 3. Iteración

### 3.1 Condición de optimalidad (diapositiva 11)

Candidatas = columnas **no básicas**, excluyendo artificiales que ya salieron de la base.
- **Max**: óptimo si todo coste reducido candidato `≥ 0`.
- **Min**: óptimo si todo coste reducido candidato `≤ 0`.

Comparación con el orden de `ValorM` (primero el término en M).

### 3.2 Variable de entrada (diapositiva 12)

- Max: la candidata con coste reducido **más negativo**.
- Min: la candidata con coste reducido **más positivo**.
- Empate → la de **menor índice de columna** (más a la izquierda). `empateEntrada = true`.

### 3.3 Variable de salida (diapositiva 14)

Para cada fila: si el coeficiente en la columna pivote es `> 0`, razón = `R / coeficiente`;
si es `≤ 0`, la fila **no participa** (`excluida`). Sale la fila con **menor razón**.
- Empate → la de **menor índice de fila** (más arriba). `empateSalida = true` (avisar posible degeneración).
- Ninguna fila participa → `estado = 'no_acotado'`, fin.

### 3.4 Elemento pivote (diapositiva 16)

Intersección de fila y columna pivote.

### 3.5 Actualizar la tabla — Gauss-Jordan (diapositiva 17)

1. Fila pivote: `nueva = actual ÷ pivote`. La básica de esa fila pasa a ser la variable de entrada.
2. Cada otra fila `i` (incluida Z): `nueva = actual − (elemento de i en la columna pivote) × nueva fila pivote`.
   En Z el factor es un `ValorM`.

Registrar una `OperacionFila` por fila con factor ≠ 0 (las filas con factor 0 no cambian; indicarlo en la UI).

Helper puro para la UI: `detalleCeldas(tablaAnterior, decision): DetalleCelda[][]` que devuelve, por fila y
columna, `{ actual, factor, nuevoPivote, resultado }` para el panel "Ver cálculo celda a celda"
(equivalente a las diapositivas 18–25).

### 3.6 Repetir

Volver a §3.1. Si se superan `maxIteraciones` → `estado = 'limite_iteraciones'` con aviso de posible ciclo.

## 4. Fin y diagnóstico

### 4.1 Infactible

Al alcanzar la optimalidad, si alguna `Aᵢ` sigue básica con valor `> 0` → `estado = 'infactible'`
(no se reporta `solucion`). Si está básica con valor `0`, la solución es válida (aviso de degeneración).

### 4.2 Solución

Básicas = su `R`; no básicas = 0. `z = valorZ.a` (en este punto `valorZ.b = 0`). Esto vale tanto para max
como para min con la forma `z − cx = 0`.

### 4.3 Óptimos alternativos

Si en la tabla óptima alguna variable **no básica, no artificial** tiene coste reducido exactamente `0` →
`estado = 'optimos_alternativos'`. Calcular `solucionAlternativa` haciendo un pivoteo más sobre la primera de
esas columnas (si tiene razón válida; si no, solo se informa el estado).

### 4.4 Avisos

| Código | Cuándo | Texto (UI) |
|--------|--------|------------|
| `no_entera` | `naturaleza = 'entera'` y algún `xⱼ` no es entero | "La solución tiene valores con decimales, pero pediste cantidades enteras. Esta es la solución del modelo sin la condición de enteros; revisa el método gráfico para ver el mejor punto entero (solo con 2 variables)." |
| `degenerada` | alguna básica con valor 0 en la solución | "Solución degenerada: una variable básica vale 0." |
| `empate` | hubo `empateEntrada` o `empateSalida` | "Hubo un empate; se eligió la primera opción (más a la izquierda / más arriba)." |
| `objetivo_cero` | todos los cⱼ = 0 | ver `03` §3.3 |

## 5. Interpretación (`interpretar.ts`)

Devuelve frases en lenguaje cotidiano **calculadas sobre las restricciones originales** (no sobre las
normalizadas), para no confundir al usuario con el cambio de signo:

- Variables (si `contexto` existe): *"Se {verbo} {valor} {unidad} de {etiqueta}."* (verbo de
  `VERBOS_POR_CATEGORIA`; si la unidad es "Unidades" se omite como en el CLI). Sin contexto: *"x₁ = 31/4"*.
- Por restricción, con `usado = Σ aᵢⱼ xⱼ`:
  - `≤`: holgura > 0 → *"Sobran {limite − usado} de «{nombre}» (se usan {usado} de {limite})."*; = 0 → *"Se usa todo lo disponible de «{nombre}»."*
  - `≥`: exceso > 0 → *"Se supera el mínimo de «{nombre}» en {usado − limite}."*; = 0 → *"Se cumple justo el mínimo de «{nombre}»."*
  - `=`: *"«{nombre}» se cumple exactamente."*
- Objetivo: *"{etiqueta de la meta}: Z = {z}"* (o *"Máximo/Mínimo de Z = {z}"* sin meta).

Todos los valores respetan el toggle fracción/decimal.

## 6. Relación con el método gráfico

Para modelos de 2 variables, `recorridoSimplex(resultado): { x1: Fraccion; x2: Fraccion; factible: boolean }[]`
devuelve el punto (x₁, x₂) de la solución básica de cada tabla. `factible = false` si alguna artificial básica
es > 0. La vista gráfica lo dibuja como "Recorrido del Simplex" (ver `05` §4).

## 7. Pruebas obligatorias

Todos los casos de `08-casos-de-prueba.md`, verificando: estado, secuencia (entra, sale, pivote) de cada
iteración, solución completa (incluidas S y A) y Z. Además:
- Ninguna `Fraccion` con denominador ≠ normalizado en ninguna tabla.
- La columna de cada básica es un vector unitario en todas las tablas (propiedad invariante).
- Min y max equivalentes: `min Z = cx` da el mismo punto que `max −cx` con Z opuesto.
