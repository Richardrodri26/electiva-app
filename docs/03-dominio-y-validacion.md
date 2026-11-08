# 03 · Dominio y validación

## 1. Aritmética exacta

### 1.1 `Fraccion` (`dominio/aritmetica/fraccion.ts`)

Inmutable, basada en `bigint`. Invariantes: `den > 0n`, `mcd(|num|, den) = 1`, el cero es `0/1`.

```ts
class Fraccion {
  static readonly CERO: Fraccion; static readonly UNO: Fraccion;
  static de(num: bigint | number, den?: bigint | number): Fraccion; // number solo si es entero seguro
  readonly num: bigint; readonly den: bigint;
  sumar(o: Fraccion): Fraccion; restar(o): Fraccion; multiplicar(o): Fraccion;
  dividir(o: Fraccion): Fraccion;            // lanza ErrorDivisionPorCero
  negar(): Fraccion; abs(): Fraccion;
  comparar(o: Fraccion): -1 | 0 | 1; igual(o): boolean;
  esCero(): boolean; esPositiva(): boolean; esNegativa(): boolean; esEntera(): boolean;
  aTexto(): string;                          // "31/4", "-3", "0"
  aDecimal(decimales = 4): string;           // "7.75", "2.6667" (redondeo half-up, sin ceros sobrantes)
  aNumero(): number;                         // SOLO para graficar
}
```

### 1.2 `ValorM` (`dominio/aritmetica/valor-m.ts`)

Representa `a + b·M` con `a, b: Fraccion` (M simbólico, "infinitamente grande").

- Orden: se compara **primero `b`**, y si empatan, `a`. `esNegativo()` ⇔ `b < 0 ∨ (b = 0 ∧ a < 0)`.
- Operaciones: `sumar`, `restar`, `multiplicarPor(f: Fraccion)`.
- Formato: `"3"`, `"M"`, `"-M"`, `"2 - 3M"`, `"-4 + M"`, `"0"` (omitir término nulo; coeficiente 1 implícito).

### 1.3 Parseo (`dominio/aritmetica/parseo.ts`)

Convierte texto a `Fraccion` **sin pasar por `number`**:

| Entrada | Resultado |
|---------|-----------|
| `"12"` | 12/1 |
| `"12,5"` / `"12.5"` | 25/2 |
| `"-3"` | -3/1 |
| `"1/3"`, `"-2/3"` | 1/3, -2/3 |
| `"0.125"` | 1/8 |

## 2. Tipos (`dominio/modelo/tipos.ts`)

Extienden los del CLI (`console-program/src/types.ts`). Los números se guardan como **texto normalizado**
(punto decimal o fracción `a/b`) para que la URL y la conversión a `Fraccion` sean exactas.

```ts
type Sentido = 'max' | 'min';
type Relacion = '<=' | '>=' | '=';
type Naturaleza = 'entera' | 'fraccionaria';
type NumeroTexto = string;               // validado por Zod: "12.5", "-3", "1/3"
type Origen = 'asistente' | 'editor' | 'ejemplo';

interface Variable {
  nombre: string;       // "x1".."x6" — generado, nunca escrito por el usuario
  etiqueta: string;     // "Mesas"
  definicion: string;   // "x1 = cantidad de Mesas que se producirán."
}

interface Objetivo {
  sentido: Sentido;
  meta?: MetaId;                 // solo asistente (1..6 del CLI)
  coeficientes: NumeroTexto[];   // mismo orden que variables
  simbolo: 'Z';
}

interface Restriccion {
  numero: number;                // 1..n, consecutivo
  nombre: string;                // "Horas" o texto libre
  coeficientes: NumeroTexto[];
  relacion: Relacion;
  limite: NumeroTexto;
}

interface ModeloLineal {
  version: 1;
  titulo?: string;               // para historial/ejemplos
  origen: Origen;
  contexto?: { categoria: CategoriaId; unidad: string };  // asistente
  variables: Variable[];
  objetivo: Objetivo;
  restricciones: Restriccion[];
  naturaleza: Naturaleza;
}
```

`catalogos.ts` copia **literalmente** del CLI: `METAS`, `CATEGORIAS`, `VERBOS_POR_CATEGORIA`, `UNIDADES`,
`TIPOS_RESTRICCION`, `FORMAS_CUMPLIMIENTO`, y la regla `meta ≤ 3 → 'max'`.

En el editor directo, `variables[i].etiqueta` por defecto es `"x{i}"` y la definición
`"x{i} = variable de decisión {i}."` (editable).

## 3. Esquemas Zod (`dominio/modelo/esquemas.ts`)

Configurar mensajes en español: `z.config(z.locales.es())` (verificar el nombre exacto en la doc de Zod 4) y
sobrescribir con mensajes propios donde se indica.

### 3.1 Números

**`numeroAsistente`** — replica `analizarNumero` del CLI con los mismos motivos y mensajes:

| Regla (en este orden) | Mensaje |
|-----------------------|---------|
| vacío | "Por favor ingrese un número válido." |
| `^-\d+([.,]\d{1,2})?$` | "Por favor ingrese un valor mayor o igual a cero." |
| no cumple `^\d+([.,]\d{1,2})?$` y tiene `.` o `,` | "No use puntos ni comas para separar miles. Escriba el número así: 10000 o, si necesita decimales, 10000.5." |
| no cumple el patrón | "Por favor ingrese un número válido." |
| > 1 000 000 000 000 | "Ese número es demasiado grande, ingrese un valor más razonable." |

Transforma a `NumeroTexto` con punto decimal. Textos tomados literalmente de `console-program/src/io/prompt.ts`.

**`numeroEditor`** — acepta `^-?\d+([.,]\d{1,6})?$` o `^-?\d+\/[1-9]\d*$`; |valor| ≤ 1e12.
Mensaje: "Escriba un número (ej: 3, -2, 2,5 o 1/3)."

### 3.2 Texto

- `nombreNoVacio`: `trim().min(1, "Por favor ingrese un nombre (no puede quedar vacío).").max(40)`.
- Etiquetas de variables **únicas** (sin distinguir mayúsculas): "Ya existe una opción con ese nombre."

### 3.3 Modelo

`esquemaModelo` con `superRefine` para reglas cruzadas:

| Regla | Mensaje |
|-------|---------|
| 2 ≤ variables ≤ 6 | "Debe haber entre 2 y 6 variables." |
| 1 ≤ restricciones ≤ 6 (asistente: 2 ≤ … ≤ 6) | "Debe haber entre 1 y 6 restricciones." |
| `objetivo.coeficientes.length === variables.length` (igual en cada restricción) | error interno (no debería ocurrir; indica bug) |
| restricción con todos los coeficientes en 0 | "La restricción {n} no involucra ninguna variable." |
| función objetivo toda en 0 | **advertencia** (no bloquea): "Todas las opciones aportan 0: cualquier punto factible es óptimo." |
| `numero` consecutivo desde 1 | se recalcula al guardar, no se valida |

Esquemas por pantalla: `esquemaPasoVariables`, `esquemaPasoObjetivo`, `esquemaPasoRestricciones`,
`esquemaPasoNaturaleza` (asistente) y `esquemaEditor`. Todos terminan validando contra `esquemaModelo`.

## 4. Formato (`dominio/modelo/formato.ts`)

Port de `console-program/src/formatter.ts` con estos cambios:

- Soporta coeficientes negativos y fracciones: `3x1 − 2x2` (signo `−` U+2212 en UI; `-` en texto plano).
- Coeficiente `1` implícito (`x1`), `-1` como `−x1`; términos con coeficiente `0` se omiten (si todos son 0, mostrar `0`).
- Devuelve **tokens** (`{ tipo: 'coef' | 'var' | 'op' | 'rel' | 'num', texto }`) para que el componente
  `<Expresion>` renderice subíndices (`x<sub>1</sub>`) y el toggle fracción/decimal.
- `formatearModeloTexto(modelo)` devuelve exactamente el formato del CLI ("MODELO GENERADO…") para "Copiar como texto".
- Relaciones en UI: `≤`, `≥`, `=`.

## 5. Serialización en la URL (`dominio/modelo/serializacion.ts`)

```ts
serializarModelo(m: ModeloLineal): string   // JSON compacto → UTF-8 → base64url
deserializarModelo(s: string): ResultadoParseo<ModeloLineal> // base64url → JSON → esquemaModelo.safeParse
```

- JSON compacto con claves cortas y versión: `{ v:1, o:'e', s:'max', c:['3','2'], r:[{n:'Horas', c:['2','5'], r:'<=', b:'35'}], …}`.
  Documentar el mapa de claves en el propio archivo.
- Sin compresión (modelos ≤ 6×6 caben en < 2 KB). Si la cadena supera 6 000 caracteres, rechazar.
- Debe ser **estable**: el mismo modelo produce el mismo string (orden fijo de claves). Se usa como `hashModelo`.
- Parser nuqs en `lib/url-state.ts`:

```ts
export const parseAsModelo = createParser({
  parse: (v) => { const r = deserializarModelo(v); return r.ok ? r.valor : null; },
  serialize: serializarModelo,
  eq: (a, b) => serializarModelo(a) === serializarModelo(b),
});
```

## 6. Pruebas mínimas del dominio

- `Fraccion`: normalización (`2/4 → 1/2`, `1/-2 → -1/2`), operaciones, comparación, `aDecimal` (redondeo), división por cero.
- `ValorM`: orden (`-M < -1000 < 0 < 3 < M - 100`), formato.
- Parseo: tabla de §1.3 y entradas inválidas.
- `numeroAsistente`: los 5 motivos con sus mensajes exactos (`"10.000"` → separador de miles; `"-5"` → negativo).
- Serialización: ida y vuelta para todos los casos de `08-casos-de-prueba.md`; string inválido → error.
- Formato: `3x1 + 2x2`, `x1 − x2`, `2/3x1`, todo-cero → `0`; salida de texto idéntica al CLI para un modelo sin negativos.
