# 09 · Guía de pruebas manuales

Recorridos para probar la aplicación a mano en el navegador. Los resultados esperados salen de
`08-casos-de-prueba.md` (verificados con dos métodos independientes) y de los E2E de `tests/e2e/`.

## 0. Preparación

```bash
pnpm install
pnpm dev            # http://localhost:3000 (desarrollo)
```

Para probar como en producción: `pnpm build && pnpm start` (mismo puerto). En producción las páginas
`/dev/*` responden 404; en desarrollo existen solo para revisión interna y **no** son parte del producto.

Conviene tener a mano: DevTools (F12) para la vista móvil (375 px) y una ventana de escritorio (1280 px).

## 1. Mapa de pantallas

| Ruta | Qué es |
| --- | --- |
| `/` | Inicio: asistente, editor, 4 ejercicios de clase y "Recientes" |
| `/modelo/asistente?paso=1..5` | Asistente en lenguaje cotidiano |
| `/modelo/editor[?m=…]` | Editor técnico directo (acepta un modelo en la URL) |
| `/resolver?m=…&vista=…` | Resultados: pestañas Modelo · Método gráfico · Simplex · Interpretación |

Parámetros de la URL de resultados: `m` (el modelo), `vista` (`modelo`, `grafico`, `simplex`,
`interpretacion`), `iter` (tabla del Simplex) y `num` (`fraccion` o `decimal`).

## 2. Recorridos

### R1 · Ejercicio de clase desde Inicio (el más rápido)

1. En `/`, bajo los ejercicios de clase, pulsar **Resolver** en "Clase · ejemplo principal" (`max Z = 3x1 + 2x2`).
2. Debe abrir `/resolver?...&vista=simplex` con la **tabla 1 de 3**.
3. Avanzar con **Siguiente** (o con las flechas ← → del teclado): tabla 2 y tabla 3.
   - Entra `x1`, sale `S2`, pivote 3; luego entra `x2`, sale `S3`, pivote 16/3.
   - En la tabla 2 las razones son `69/19`, una excluida y `21/8`.
4. Tabla final: **Z = 57/2**, `x1 = 31/4`, `x2 = 21/8`, estado "solución óptima".

Repetir con los otros tres ejercicios y comparar:

| Ejercicio | Resultado esperado |
| --- | --- |
| Actividad en clase (`3x1 + 5x2`) | `x1 = 8/3`, `x2 = 8/3`, **Z = 64/3** |
| Compromiso (`4x1 + 3x2`) | `x1 = 5`, `x2 = 2`, **Z = 26** |
| Ejercicio 2 (`6x1 + 4x2`) | `x1 = 24/5`, `x2 = 22/5`, **Z = 232/5** |

### R2 · Persistencia en la URL

1. En R1, ir a la **iteración 2** (tabla 3 de 3) y comprobar que la URL tiene `iter=2`.
2. Recargar la página (F5): debe seguir en la iteración 2.
3. Cambiar el interruptor **Fracción / Decimal**: los números cambian de formato y la URL lleva `num=decimal`.
4. Pulsar **Copiar enlace** (toast "Enlace copiado"), abrir ese enlace en otra pestaña: mismo modelo, misma vista.

### R3 · Método gráfico (solo con 2 variables)

1. Abrir "Compromiso" y pasar a la pestaña **Método gráfico**.
2. Tabla de vértices esperada: (0,0) Z=0 · (6,0) Z=24 · **(5,2) Z=26 (marcado "Óptimo")** · (0,7) Z=21.
3. Mover el deslizador de la **recta de nivel**: la recta punteada recorre la región y llega al vértice óptimo.
   Debe quedar siempre dentro del área de la gráfica.
4. Marcar **Mostrar recorrido del Simplex**: se dibuja el camino entre vértices.
5. Ordenar la tabla de vértices pulsando los encabezados (x1, x2, Z).
6. Pasar el ratón o el foco por un vértice de la tabla y ver que se resalta en la gráfica (y al revés).

### R4 · Editor técnico

1. En `/`, elegir el editor (o ir a `/modelo/editor`).
2. Menú **Cargar ejemplo** → elegir uno, o escribir a mano: `max Z = 3x1 + 5x2`, R1: `2x1 + 1x2 ≤ 8`, R2: `1x1 + 2x2 ≤ 8`.
3. La **vista previa** debe mostrar la notación matemática mientras se completan los números.
4. Probar errores: dejar un número vacío, escribir letras, escribir un límite no numérico. Debe avisar en español y no dejar resolver.
5. Pulsar **Resolver con Simplex** o **Método gráfico**: abre resultados en la vista correspondiente.
6. En resultados pulsar **← Editar**: vuelve al editor con el modelo cargado.
7. Probar **Agregar una variable** (3 variables): el método gráfico queda deshabilitado (ver R9).
8. Probar **Solo valores enteros** con "Actividad en clase" (ver R8).

### R5 · Asistente completo (lenguaje cotidiano)

Modelo "Compromiso" expresado como Mesas y Sillas. Textos literales del asistente:

1. `/modelo/asistente`. **Paso 1**: elegir "Productos", llamar a la opción 1 "Mesas" y a la 2 "Sillas" → **Continuar**.
2. **Paso 2**: meta "Mayor utilidad"; cada Mesas aporta `4`, cada Sillas `3` → **Continuar**.
3. **Paso 3** (limitaciones):
   - Limitación 1 "Presupuesto": Mesas `2`, Sillas `1`, cantidad disponible `12`.
   - **Agregar limitación** → se agrega colapsada; abrirla, cambiar el tipo a "Horas": Mesas `1`, Sillas `1`, cantidad `7`.
   - **Continuar**.
4. **Paso 4**: elegir "Deben ser unidades completas (enteras)" → **Continuar**.
5. **Paso 5**: se ve el resumen del modelo. Pulsar **Resolver modelo**.
6. Debe abrir `/resolver?...&vista=modelo`. En la pestaña **Interpretación** esperar:
   - "Se producirán 5 de Mesas." y "Se producirán 2 de Sillas."
   - "Se usa todo lo disponible de «Presupuesto»." y lo mismo para «Horas».
   - "Mayor utilidad: Z = 26".

Comprobar también que **nunca** aparece vocabulario técnico (coeficiente, restricción, función objetivo) en los pasos del asistente.

### R6 · Asistente: corregir, cancelar y borrador

1. En el paso 5 abrir **Corregir…** y probar cada sección (objetivo, limitaciones, cantidades, "Las opciones que se están comparando", "Todo desde el inicio").
   Corregir las opciones muestra un aviso y lleva al paso 1 con los pasos 2 y 3 pendientes.
2. **Cancelar** pide confirmación ("¿Cancelar y borrar lo registrado?"). Con **Sí, cancelar** vuelve a **Inicio** (`/`) y borra el borrador.
3. **Borrador**: avanzar hasta el paso 3, cerrar la pestaña y volver a `/modelo/asistente`:
   debe ofrecer "Tiene un modelo sin terminar" con **Continuar** o **Descartar**.
   El banner no debe aparecer en plena sesión al ir avanzando de paso.

### R7 · Menú "⋯" de resultados

1. **Copiar como texto** (toast "Copiado"): pegar en un editor; debe empezar con `MODELO GENERADO` y listar variables, función objetivo, restricciones y condiciones.
2. **Imprimir** (o Ctrl+P): la vista previa debe mostrar solo el contenido, sin encabezado del sitio ni controles:
   el modelo, **todas** las tablas del Simplex (no solo la visible) y la gráfica (con 2 variables). Probar en claro y oscuro.
3. **Guardar con nombre**: pide un nombre y lo guarda en el historial.

### R8 · Casos especiales (modelos para cargar en el editor)

| Caso | Modelo | Resultado esperado |
| --- | --- | --- |
| Minimización con ≥ (Gran M) | `min Z = 2x1 + 3x2`; `x1 + x2 ≥ 4`; `x1 + 3x2 ≥ 6` | **Z = 9** con `x1 = 3`, `x2 = 1`; aparecen variables artificiales `A` |
| Igualdad | `max Z = x1 + 2x2`; `x1 + x2 = 5`; `x1 ≤ 3` | **Z = 10** con `x2 = 5` |
| **Infactible** | `max Z = x1 + x2`; `x1 + x2 ≤ 2`; `x1 + x2 ≥ 5` | Simplex: "Ningún punto cumple todas las restricciones a la vez. Revise los límites de Restricción 2." Gráfico: sin región factible |
| **No acotado** | `max Z = x1 + x2`; `x1 − x2 ≤ 1` | "Z puede crecer sin límite: falta alguna limitación. Revise sus restricciones." |
| Óptimos alternativos | `max Z = 2x1 + 4x2`; `x1 + 2x2 ≤ 8`; `x1 ≤ 6` | **Z = 16**; estado de óptimos alternativos y una **tabla extra** al final con la solución alternativa (`x1 = 6`, `x2 = 1`) |
| Entera | "Actividad en clase" con **Solo valores enteros** | Solución fraccionaria con aviso de que no es entera; el gráfico propone el mejor punto entero **(2, 3) con Z = 21** |
| Tres variables | `max Z = 5x1 + 4x2 + 3x3`; `2x1 + 3x2 + x3 ≤ 5`; `4x1 + x2 + 2x3 ≤ 11`; `3x1 + 4x2 + 2x3 ≤ 8` | **Z = 13** con `x1 = 2`, `x3 = 1`; el método gráfico está deshabilitado |
| Mixto (3 variables) | `min Z = 2x1 + 3x2 + 4x3`; `x1 + x2 + x3 ≥ 10`; `2x1 + x2 ≤ 20`; `x2 + 3x3 = 9` | **Z = 26** con `x1 = 7`, `x3 = 3` |

En los casos infactible y no acotado, revisar también las pestañas **Método gráfico** e **Interpretación**:
la interpretación avisa que no hay solución final ("no hay frases de interpretación").

### R9 · Método gráfico deshabilitado

Con un modelo de 3 o más variables, la pestaña **Método gráfico** aparece deshabilitada.
Al pasar el ratón o el foco debe mostrar: "El método gráfico solo aplica a modelos con 2 variables. Use el Simplex."

### R10 · Historial

1. Resolver 2 o 3 modelos distintos. Cada uno se guarda solo (también los infactibles y no acotados).
2. En `/`, la sección **Recientes** muestra los 3 últimos con **Ver todo**.
3. Pulsar **Historial** en el encabezado: se abre el panel con el más reciente primero.
4. Abrir una entrada (lleva a resultados), **renombrar** y **eliminar** (pide confirmación).
5. Con el historial vacío: estado vacío "Todavía no resolvió ningún modelo".

### R11 · Enlaces inválidos y errores

| Probar | Esperado |
| --- | --- |
| `/resolver?m=basura` | Mensaje amable "Este enlace no contiene un modelo válido." con **Abrir editor** e **Ir al inicio** |
| `/resolver` (sin `m`) | El mismo mensaje |
| `/resolver?m=` | El mismo mensaje |
| `/resolver?m=e30` | El mismo mensaje (JSON vacío) |
| `?iter=99` o `?iter=-3` en el Simplex | Se recorta al rango válido, no se rompe |
| `/una-ruta-que-no-existe` | Página 404 con "Ir al inicio" |
| `/dev/editor` en producción | 404 |

### R12 · Accesibilidad, tema y responsive

1. **Tema**: alternar claro / oscuro / sistema desde el encabezado. Revisar contraste, en especial el resaltador amarillo de las tablas Simplex.
2. **Teclado**: recorrer cada pantalla solo con Tab / Shift+Tab / Enter / flechas. El foco debe verse siempre y el orden ser lógico.
   En las tablas del Simplex, ← y → cambian de iteración.
3. **Responsive**: probar a 375, 768, 1024 y 1440 px. No debe haber scroll horizontal de la página
   (las tablas anchas pueden desplazarse dentro de su contenedor).
4. **Táctil**: en 375 px todos los botones, pestañas y controles deben ser fáciles de tocar (mínimo 44 px).
5. **Lector de pantalla** (opcional): los enlaces deben anunciarse como enlaces ("← Editar", "Abrir editor", "Ir al inicio") y las fracciones deben leerse completas.

## 3. Lista rápida de verificación

- [ ] R1 · Los 4 ejercicios de clase dan el Z esperado.
- [ ] R2 · `iter` y `num` sobreviven a recargar; "Copiar enlace" funciona.
- [ ] R3 · El gráfico marca el óptimo correcto y la recta de nivel no se sale.
- [ ] R4 · El editor valida, previsualiza y vuelve con "← Editar".
- [ ] R5 · El asistente completo termina en las frases de interpretación esperadas.
- [ ] R6 · Corregir / Cancelar / borrador funcionan.
- [ ] R7 · Copiar como texto, imprimir y guardar con nombre.
- [ ] R8 · Infactible, no acotado, óptimos alternativos, enteros y 3 variables.
- [ ] R9 · Método gráfico deshabilitado con 3+ variables.
- [ ] R10 · Historial: guardar, abrir, renombrar, eliminar.
- [ ] R11 · Enlaces inválidos muestran el mensaje amable.
- [ ] R12 · Tema, teclado y responsive.

## 4. Si algo falla

Anotar la URL completa (lleva el modelo en `m=`), el navegador y los pasos exactos. Con esa URL el problema
se reproduce directamente. Los resultados correctos de referencia están en `08-casos-de-prueba.md`.
