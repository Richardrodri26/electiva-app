# 01 · Producto

## Objetivo

Que un estudiante (o cualquier persona sin conocimientos de programación lineal) pueda **formular** un modelo
de PL y **resolverlo** por el **método gráfico** y por el **método Simplex**, entendiendo cada paso tal como
se enseñó en clase, con una interfaz cuidada y agradable.

## Usuarios

| Perfil | Necesidad | Entrada típica |
|--------|-----------|----------------|
| Persona sin formación en PL | Plantear una decisión real sin jerga | Asistente |
| Estudiante de la electiva | Resolver ejercicios de clase y ver cada tabla | Editor directo / ejemplos de clase |
| Docente | Mostrar en clase el paso a paso; compartir un enlace | Editor directo + enlace compartible |

## Decisiones tomadas (confirmadas con el responsable)

| Tema | Decisión |
|------|----------|
| Alcance del Simplex | Restricciones ≤, ≥ y =. Se usa **Gran M** para ≥ y =. No se implementa Dos Fases. |
| Variables enteras | Se conserva la opción del CLI. Se resuelve la **relajación lineal** y se avisa si el óptimo no es entero. En el gráfico se marcan los puntos enteros factibles y el mejor punto entero. No hay Branch & Bound. |
| Tamaño del modelo | Simplex: 2 a 6 variables, 1 a 6 restricciones (asistente: 2 a 6). Método gráfico: **solo 2 variables**. |
| Captura | **Asistente** (port del CLI, lenguaje cotidiano) **+ editor directo** (técnico, admite negativos y fracciones). |
| Números | **Aritmética racional exacta**. Se muestran en fracción por defecto con un **toggle fracción/decimal**. |
| Backend | **Ninguno.** 100 % cliente. Modelo en la URL (nuqs), historial en `localStorage`. |
| Herramientas | pnpm, Vitest, Playwright. |

## Alcance funcional

### Incluido

1. **Inicio**: elegir "Asistente" o "Editor directo"; cargar un ejemplo de clase; ver historial.
2. **Asistente** (port del CLI): 4 pasos + resumen con "generar / modificar sección / cancelar".
3. **Editor directo**: sentido (max/min), variables, función objetivo y restricciones en una grilla.
4. **Vista de resultados** con pestañas:
   - **Modelo**: notación matemática (variables, función objetivo, restricciones, condiciones) — equivalente a la salida del CLI.
   - **Método gráfico** (si hay 2 variables): región factible, rectas, vértices, tabla de vértices, recta de nivel de Z, óptimo.
   - **Simplex**: forma estándar, tabla inicial y cada iteración (variable de entrada, razones, variable de salida, elemento pivote, operaciones de fila), tabla final, solución.
   - **Interpretación**: la solución en lenguaje cotidiano ("Conviene producir…", "Te sobran… de Horas").
5. **Toggle fracción/decimal**, global y persistido en la URL.
6. **Compartir**: copiar el enlace (el modelo viaja en la URL).
7. **Historial local**: últimos 20 modelos resueltos; abrir, renombrar, eliminar.
8. **Exportar**: copiar el modelo en texto (formato del CLI) e imprimir la vista de resultados (CSS de impresión).
9. Tema claro/oscuro; responsive; accesible por teclado.

### Fuera de alcance

Dos Fases · Branch & Bound · método gráfico con 3 variables (3D) · análisis de sensibilidad ·
dual · cuentas de usuario · backend · i18n (solo español).

## Historias de usuario y criterios de aceptación

**HU-01 Formular con asistente.** Como persona sin conocimientos de PL quiero responder preguntas sencillas para obtener mi modelo.
- Mismas preguntas, opciones y textos del CLI (`console-program/src/flow/*.ts`), adaptados a formulario.
- La meta elegida determina max/min (metas 1–3 → max, 4–6 → min). Nunca se pregunta "maximizar o minimizar".
- Validaciones con los mismos mensajes del CLI (formato, separador de miles, demasiado grande, negativo, vacío).
- En el resumen puedo corregir una sección; si cambio las opciones (variables), se me avisa y se recapturan objetivo y limitaciones, como en `modelBuilder.ts`.

**HU-02 Formular con editor directo.** Como estudiante quiero escribir un ejercicio de clase tal cual.
- Acepto coeficientes y límites negativos, decimales y fracciones (`-3`, `2.5`, `2,5`, `1/3`).
- Puedo agregar/quitar variables (2–6) y restricciones (1–6) sin perder lo escrito en las demás.
- Un límite negativo se acepta; el motor lo normaliza (ver `04-motor-simplex.md` §2.1).

**HU-03 Cargar ejemplo de clase.** Los casos de `08-casos-de-prueba.md` marcados "ejemplo" aparecen en Inicio y abren el resultado directamente.

**HU-04 Resolver por método gráfico.** Con 2 variables veo la región factible, las rectas etiquetadas por restricción, los vértices con su valor de Z y el óptimo resaltado. Con ≠ 2 variables la pestaña está deshabilitada con una explicación.

**HU-05 Resolver por Simplex paso a paso.** Veo cada tabla con la columna, fila y elemento pivote resaltados, las razones calculadas (y por qué una fila no participa), y las operaciones de Gauss-Jordan. Puedo avanzar/retroceder iteraciones y el número de iteración queda en la URL.

**HU-06 Casos especiales.** La app informa claramente: solución óptima única, **óptimos alternativos**, **no acotado**, **infactible** y **solución no entera** (si se pidió entera). Gráfico y Simplex deben coincidir en el diagnóstico.

**HU-07 Compartir y retomar.** Al abrir un enlace compartido se ve el mismo modelo y la misma vista. Un enlace corrupto muestra un error amable con opción de ir al editor.

**HU-08 Historial.** Cada resolución exitosa se guarda en el historial local; puedo reabrirla.

## Métricas de calidad

- Resultado visible < 300 ms para un modelo 6×6 en un portátil promedio.
- Lighthouse ≥ 90 en Accesibilidad y Buenas prácticas.
- 100 % de los casos de `08-casos-de-prueba.md` pasan en Vitest.
