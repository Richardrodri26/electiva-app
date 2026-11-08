# 05 · Método gráfico

Disponible **solo con 2 variables**. Con otra cantidad, la pestaña aparece deshabilitada con el tooltip:
*"El método gráfico solo aplica a modelos con 2 variables. Usa el Simplex."*

Archivos: `dominio/grafico/{tipos,resolver}.ts` (puro, `Fraccion`) y `features/resultados/vista-grafico/`.

## 1. Entrada y salida

```ts
function resolverGrafico(modelo: ModeloLineal): ResultadoGrafico;

type EstadoGrafico = 'optimo' | 'optimos_alternativos' | 'no_acotado' | 'infactible';

interface ResultadoGrafico {
  estado: EstadoGrafico;
  rectas: Recta[];                 // una por restricción + ejes
  vertices: Vertice[];             // vértices de la región factible, en orden angular
  regionAcotada: boolean;
  optimo?: { punto: Punto; z: Fraccion };
  segmentoOptimo?: [Punto, Punto]; // si optimos_alternativos
  puntosEnteros?: PuntoEntero[];   // solo si naturaleza = 'entera' (§3.5)
  mejorEntero?: { punto: Punto; z: Fraccion };
  dominio: { x1: [number, number]; x2: [number, number] }; // para la gráfica
}

interface Recta {
  restriccion: number | 'eje_x1' | 'eje_x2';
  a1: Fraccion; a2: Fraccion; b: Fraccion; relacion: Relacion;
  interceptos: { x1?: Fraccion; x2?: Fraccion };  // con los ejes, si existen
}

interface Vertice {
  id: string;                      // "A", "B", "C"… en orden angular empezando por el más cercano al origen
  punto: Punto;                    // { x1: Fraccion; x2: Fraccion }
  z: Fraccion;
  restriccionesActivas: (number | 'eje_x1' | 'eje_x2')[];
  esOptimo: boolean;
}
```

## 2. Algoritmo (aritmética exacta)

1. **Rectas**: cada restricción `a1·x1 + a2·x2 (rel) b` más los ejes `x1 = 0` y `x2 = 0` (con `≥ 0`).
   Restricción con `a1 = a2 = 0`: no es recta; si `0 (rel) b` es falso → `infactible`; si es verdadero se ignora.
2. **Intersecciones**: para cada par de rectas no paralelas, resolver por Cramer. Paralelas (determinante 0) se omiten.
3. **Factibilidad**: conservar los puntos que cumplen **todas** las restricciones y la no negatividad
   (comparación exacta). Eliminar duplicados.
4. **Sin puntos factibles** → `infactible`.
5. **Acotamiento**: la región es no acotada si existe una dirección `d ≥ 0, d ≠ 0` con `a·d ≤ 0` para
   todas las `≤`, `a·d ≥ 0` para todas las `≥`, `a·d = 0` para todas las `=`. Basta probar como candidatas
   las direcciones `(1,0)`, `(0,1)` y las direcciones de cada recta (`(a2, −a1)` y `(−a2, a1)`) que sean ≥ 0.
6. **Óptimo**:
   - Evaluar Z en cada vértice.
   - Si la región es no acotada y alguna dirección de recesión `d` mejora Z (`c·d > 0` en max, `< 0` en min)
     → `no_acotado`.
   - Si no, el óptimo es el mejor vértice. Si dos vértices **adyacentes** empatan en el mejor Z →
     `optimos_alternativos` con `segmentoOptimo`. (En región no acotada, si una dirección de recesión tiene
     `c·d = 0` desde el óptimo, también hay alternativos: informar estado sin segmento.)
7. **Orden de vértices**: ordenar por ángulo respecto al centroide (aquí se puede usar `number`, solo para
   ordenar); la etiqueta "A" es el vértice más cercano al origen y se sigue en sentido antihorario.
8. **Dominio de la gráfica**: `max` de interceptos positivos y coordenadas de vértices, × 1,2; mínimo 1.
   Si la región es no acotada, extender a × 1,6 y dibujar la región recortada al dominio con un patrón
   que indique que continúa (§4).

### 2.1 Puntos enteros (si `naturaleza = 'entera'`)

Solo si la región es acotada: enumerar los enteros `(i, j)` con `0 ≤ i ≤ ⌊max x1⌋`, `0 ≤ j ≤ ⌊max x2⌋`
que sean factibles. Si son más de 2 500, no dibujarlos y avisar *"Hay demasiados puntos enteros para
mostrarlos"*, pero sí calcular `mejorEntero` (recorrido completo; es exacto para 2 variables).

## 3. Coherencia con el Simplex

Para el mismo modelo, `estado` (agrupando `optimo` y `optimos_alternativos` como "tiene solución"), el valor
óptimo de Z y, si es único, el punto óptimo **deben coincidir** con el Simplex. Hay una prueba que lo verifica
para todos los casos de 2 variables de `08-casos-de-prueba.md`.

## 4. Visualización

Contenedor: `Card` con la gráfica (izquierda/arriba) y un panel lateral (derecha/abajo) con la tabla de
vértices y controles.

### 4.1 Capas de la gráfica (de atrás hacia adelante)

| Capa | Descripción |
|------|-------------|
| Cuadrícula y ejes | Ejes x₁ y x₂ con etiquetas que usan la `etiqueta` de cada variable (ej. "x₁ · Mesas"). |
| Región factible | Polígono relleno con el color primario al 18 % de opacidad. Si es no acotada, borde punteado en el lado abierto. Si hay restricciones `=`, la región es un segmento: dibujarlo grueso. |
| Rectas de restricciones | Una línea por restricción, color categórico propio, etiqueta "R1 · Horas" cerca del extremo. Una pequeña flecha/sombreado indica el semiplano permitido. |
| Recta de nivel de Z | Línea discontinua `c1·x1 + c2·x2 = k`. Un `Slider` mueve `k` de 0 al valor óptimo (o al máximo del dominio). Flecha con la dirección en que mejora Z. |
| Recorrido del Simplex (opcional) | Toggle "Mostrar recorrido del Simplex": puntos numerados (0, 1, 2…) unidos con flechas; los no factibles (artificiales > 0) con relleno hueco. |
| Puntos enteros | Si aplica: puntos pequeños grises; el mejor entero con anillo. |
| Vértices | Puntos con etiqueta (A, B, C…). Tooltip: coordenadas, Z y restricciones activas. |
| Óptimo | Vértice resaltado (más grande, color de éxito, etiqueta "Óptimo"). Si hay alternativos, el segmento se resalta. |

### 4.2 Tabla de vértices (TanStack Table)

Columnas: Vértice · x₁ · x₂ · Z · Restricciones activas · Estado (badge "Óptimo"). Ordenable por Z.
Pasar el cursor/foco por una fila resalta el vértice en la gráfica (y viceversa: selección enlazada).

### 4.3 Panel de resultado

Alerta con el estado (§1) en lenguaje claro, la solución óptima y, si aplica, el mejor punto entero
y la diferencia con el óptimo continuo.

## 5. Implementación con TanStack Charts

TanStack Charts (`@tanstack/charts`, adaptador `@tanstack/charts/react`) es una gramática de **marcas**
(`lineY`, `areaY`, `dot`, `ruleY`, `text`…) sobre escalas lineales, con tooltip accesible y selección enlazada
con tablas. **Es una librería reciente: lee su documentación actual antes de empezar** y confirma:

1. Cómo dibujar un **polígono arbitrario** (región factible). Si no existe una marca de polígono/área cerrada,
   usar `areaY` con `y1`/`y2` calculando la envolvente inferior y superior de la región sobre una malla de x₁
   (la región es convexa, así que para cada x₁ es un intervalo). Las restricciones verticales (`a2 = 0`) se
   resuelven ajustando el rango de x₁ de la malla.
2. Cómo dibujar **líneas por dos puntos** que no sean función de x (rectas verticales `a2 = 0`).
3. Cómo anotar texto, flechas y tooltips personalizados con formato fracción/decimal.
4. Cómo enlazar el foco de la gráfica con la tabla de vértices.

Si alguno de estos puntos no es posible con la API pública, **detente y consulta** antes de añadir otra
librería o dibujar SVG a mano.

Reglas de la gráfica:
- Escalas lineales con el mismo dominio calculado en §2 paso 8; aspecto ≈ 1:1 en escritorio.
- Colores desde tokens CSS (`--chart-1…--chart-6`, ver `06-ux-ui.md`), funcionan en claro y oscuro.
- Las coordenadas se convierten con `Fraccion.aNumero()` **solo aquí**.
- Responsive (ancho del contenedor); en móvil la gráfica va arriba a ancho completo.
- Accesible: resumen textual de la gráfica (`aria-describedby`) con vértices y óptimo; la tabla es la alternativa equivalente.

## 6. Pruebas

- Unitarias de `resolverGrafico` con todos los casos de 2 variables de `08-casos-de-prueba.md` (vértices exactos, estado, óptimo).
- Casos de borde: restricción vertical (`x1 ≤ 3`), horizontal, paralelas, región = segmento (`=`), región = punto, `0·x1 + 0·x2 ≤ 5` y `≤ −5`.
- Coherencia con el Simplex (§3).
