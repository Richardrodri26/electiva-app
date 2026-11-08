# 08 · Casos de prueba (fixtures)

Resultados **verificados** con dos métodos independientes (enumeración exacta de vértices y una
implementación de referencia de Gran M que sigue `04-motor-simplex.md` al pie de la letra).
Los casos marcados **ejemplo** se publican también en `public/ejemplos.json` (§2).

Notación de la traza: `entra / sale / pivote` por iteración. Valores no listados = 0.

## 1. Casos

### C1 · Clase · ejemplo principal (ejemplo) — diapositivas 8–29

```
max Z = 3x1 + 2x2
R1:  2x1 + 5x2 ≤ 35
R2: -3x1 + 2x2 ≥ -18     (se normaliza a 3x1 − 2x2 ≤ 18)
R3:  2x1 + 4x2 ≤ 26
```
- Traza: `x1 / S2 / 3` → `x2 / S3 / 16/3`
- Tabla tras la iteración 1 (comparar con la diapositiva 27):
  `S1: [0, 19/3, 1, -2/3, 0 | 23]`, `x1: [1, -2/3, 0, 1/3, 0 | 6]`, `S3: [0, 16/3, 0, -2/3, 1 | 14]`, `Z: [0, -4, 0, 1, 0 | 18]`;
  razones `69/19`, excluida, `21/8`.
- Solución: `x1 = 31/4, x2 = 21/8, S1 = 51/8` · **Z = 57/2** · estado `optimo`
- Vértices: (0,0) Z=0 · (6,0) Z=18 · (31/4, 21/8) Z=57/2 · (0, 13/2) Z=13

### C2 · Actividad en clase (ejemplo)

```
max Z = 3x1 + 5x2
R1: 2x1 + x2 ≤ 8
R2: x1 + 2x2 ≤ 8
```
- Traza: `x2 / S2 / 2` → `x1 / S1 / 3/2`
- Solución: `x1 = 8/3, x2 = 8/3` · **Z = 64/3** · `optimo`
- Vértices: (0,0) 0 · (4,0) 12 · (8/3, 8/3) 64/3 · (0,4) 20

### C2-E · Igual a C2 con `naturaleza = 'entera'`

- Simplex: misma solución + aviso `no_entera`.
- Gráfico: 17 puntos enteros factibles; **mejor entero (2, 3) con Z = 21**.

### C3 · Compromiso (ejemplo)

```
max Z = 4x1 + 3x2
R1: 2x1 + x2 ≤ 12
R2: x1 + x2 ≤ 7
```
- Traza: `x1 / S1 / 2` → `x2 / S2 / 1/2`
- Solución: `x1 = 5, x2 = 2` · **Z = 26** · `optimo`
- Vértices: (0,0) 0 · (6,0) 24 · (5,2) 26 · (0,7) 21

### C4 · Ejercicio 2 (ejemplo)

```
max Z = 6x1 + 4x2
R1: 2x1 + x2 ≤ 14
R2: x1 + 3x2 ≤ 18
```
- Traza: `x1 / S1 / 2` → `x2 / S2 / 5/2`
- Solución: `x1 = 24/5, x2 = 22/5` · **Z = 232/5** · `optimo`
- Vértices: (0,0) 0 · (7,0) 42 · (24/5, 22/5) 232/5 · (0,6) 24

### C5 · Minimización con ≥ (Gran M)

```
min Z = 2x1 + 3x2
R1: x1 + x2 ≥ 4
R2: x1 + 3x2 ≥ 6
```
- Columnas: `x1 x2 S1 S2 A1 A2`. Fila Z inicial `[-2, -3, 0, 0, -M, -M | 0]`; tras ajuste de M:
  `[-2 + 2M, -3 + 4M, -M, -M, 0, 0 | 10M]`.
- Traza: `x2 / A2 / 3` → `x1 / A1 / 2/3`
- Solución: `x1 = 3, x2 = 1` · **Z = 9** · `optimo`
- Gráfico: región no acotada; vértices (0,4) 12 · (3,1) 9 · (6,0) 12; óptimo acotado.

### C6 · Restricción de igualdad

```
max Z = x1 + 2x2
R1: x1 + x2 = 5
R2: x1 ≤ 3
```
- Columnas: `x1 x2 S2 A1`.
- Traza: `x2 / A1 / 1`
- Solución: `x2 = 5, S2 = 3` · **Z = 10** · `optimo`
- Gráfico: región = segmento entre (0,5) Z=10 y (3,2) Z=7.

### C7 · Infactible

```
max Z = x1 + x2
R1: x1 + x2 ≤ 2
R2: x1 + x2 ≥ 5
```
- Traza: `x1 / S1 / 1`; termina con `A2 = 3` básica → **`infactible`**.
- Gráfico: sin puntos factibles → `infactible`.

### C8 · No acotado

```
max Z = x1 + x2
R1: x1 − x2 ≤ 1
```
- Traza: `x1 / S1 / 1` → entra `x2`, ninguna razón válida → **`no_acotado`**.
- Gráfico: `no_acotado`.

### C9 · Óptimos alternativos

```
max Z = 2x1 + 4x2
R1: x1 + 2x2 ≤ 8
R2: x1 ≤ 6
```
- Traza: `x2 / S1 / 2`; en la tabla óptima `x1` (no básica) tiene coste reducido 0 → **`optimos_alternativos`**.
- Solución: `x2 = 4, S2 = 6` · **Z = 16**
- Solución alternativa (pivoteo `x1 / S2 / 1`): `x1 = 6, x2 = 1` · Z = 16
- Gráfico: segmento óptimo entre (0,4) y (6,1).

### C10 · Tres variables

```
max Z = 5x1 + 4x2 + 3x3
R1: 2x1 + 3x2 + x3 ≤ 5
R2: 4x1 + x2 + 2x3 ≤ 11
R3: 3x1 + 4x2 + 2x3 ≤ 8
```
- Traza: `x1 / S1 / 2` → `x3 / S3 / 1/2`
- Solución: `x1 = 2, x3 = 1, S2 = 1` · **Z = 13** · `optimo`
- Método gráfico: no disponible.

### C11 · Tres variables, mixto (min, ≥, ≤, =)

```
min Z = 2x1 + 3x2 + 4x3
R1: x1 + x2 + x3 ≥ 10
R2: 2x1 + x2 ≤ 20
R3: x2 + 3x3 = 9
```
- Columnas: `x1 x2 x3 S1 S2 A1 A3`.
- Traza: `x3 / A3 / 3` → `x1 / A1 / 1`
- Solución: `x1 = 7, x3 = 3, S2 = 6` · **Z = 26** · `optimo`

### C12 · Lado derecho negativo con igualdad (normalización)

```
max Z = x1 + x2
R1: -x1 - x2 = -4      (se normaliza a x1 + x2 = 4)
R2: x1 ≤ 3
```
- Debe registrarse el paso de normalización. Columnas: `x1 x2 S2 A1`.
- Fila Z tras ajuste de M: `[-1 - M, -1 - M, 0, 0 | -4M]` → **empate de entrada**, entra `x1` (más a la izquierda); aviso `empate`.
- Traza: `x1 / S2 / 1` → `x2 / A1 / 1`
- Solución: `x1 = 3, x2 = 1` · **Z = 4** · `optimos_alternativos` (S2 no básica con coste reducido 0).
- Gráfico: región = segmento (0,4)–(3,1), ambos con Z = 4 → `optimos_alternativos`.

## 2. `public/ejemplos.json`

```json
[
  {
    "id": "clase-principal",
    "titulo": "Clase · ejemplo principal",
    "modelo": {
      "version": 1, "origen": "ejemplo", "naturaleza": "fraccionaria",
      "variables": [
        { "nombre": "x1", "etiqueta": "x1", "definicion": "x1 = variable de decisión 1." },
        { "nombre": "x2", "etiqueta": "x2", "definicion": "x2 = variable de decisión 2." }
      ],
      "objetivo": { "sentido": "max", "coeficientes": ["3", "2"], "simbolo": "Z" },
      "restricciones": [
        { "numero": 1, "nombre": "Restricción 1", "coeficientes": ["2", "5"],  "relacion": "<=", "limite": "35" },
        { "numero": 2, "nombre": "Restricción 2", "coeficientes": ["-3", "2"], "relacion": ">=", "limite": "-18" },
        { "numero": 3, "nombre": "Restricción 3", "coeficientes": ["2", "4"],  "relacion": "<=", "limite": "26" }
      ]
    }
  }
]
```

Agregar con la misma forma: `actividad-clase` (C2), `compromiso` (C3), `ejercicio-2` (C4).
