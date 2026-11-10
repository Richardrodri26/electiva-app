import { expect, test, type Locator } from "@playwright/test";

/**
 * T8.2 · escenario 3: ejemplo de 2 variables → Método gráfico → la tabla de vértices tiene el
 * óptimo correcto. Vértices y óptimo de docs/08-casos-de-prueba.md (C3 y C4, ambos ejemplos
 * precargados del editor).
 */

interface CasoGrafico {
  ejemplo: string;
  /** "x1|x2|Z" por vértice, tal como los lista docs/08. */
  vertices: string[];
  optimo: { x1: string; x2: string; z: string };
}

const CASOS: CasoGrafico[] = [
  {
    ejemplo: "Compromiso", // C3
    vertices: ["0|0|0", "6|0|24", "5|2|26", "0|7|21"],
    optimo: { x1: "5", x2: "2", z: "26" },
  },
  {
    ejemplo: "Ejercicio 2", // C4
    vertices: ["0|0|0", "7|0|42", "24/5|22/5|232/5", "0|6|24"],
    optimo: { x1: "24/5", x2: "22/5", z: "232/5" },
  },
];

/** Lee una celda numérica: las fracciones exponen su valor en `aria-label` (`<NumeroRacional>`), los enteros en el texto. */
async function valorDeCelda(celda: Locator): Promise<string> {
  const conEtiqueta = celda.locator("[aria-label]");
  if ((await conEtiqueta.count()) > 0) {
    return (await conEtiqueta.first().getAttribute("aria-label")) ?? "";
  }
  return ((await celda.textContent()) ?? "").trim();
}

test.describe("Editor → Método gráfico", () => {
  test.setTimeout(90_000);

  for (const caso of CASOS) {
    test(`"${caso.ejemplo}": la tabla de vértices marca el óptimo correcto`, async ({ page }) => {
      await page.goto("/modelo/editor");

      await page.getByRole("button", { name: "Cargar ejemplo" }).click();
      await page.getByRole("menuitem", { name: caso.ejemplo, exact: true }).click();
      await expect(page.getByLabel("Coeficiente de x1 en Z")).not.toHaveValue("");

      await page.getByRole("button", { name: "Método gráfico" }).click();
      await expect(page).toHaveURL(/\/resolver\?.*vista=grafico/);

      const panel = page.getByRole("tabpanel");

      // Panel de resultado: "Z = … con x1 = … y x2 = …".
      const alerta = panel.getByRole("alert").filter({ hasText: "Solución óptima" });
      await expect(alerta).toContainText(`Z = ${caso.optimo.z}`);
      await expect(alerta).toContainText(`x1 = ${caso.optimo.x1}`);
      await expect(alerta).toContainText(`x2 = ${caso.optimo.x2}`);

      // Tabla de vértices: columnas Vértice | x1 | x2 | Z | Restricciones activas | Estado.
      const tabla = panel.getByRole("table", { name: /Vértices de la región factible/ });
      const filas = tabla.getByRole("row").filter({ has: page.getByRole("cell") });
      await expect(filas).toHaveCount(caso.vertices.length);

      const leidos: string[] = [];
      for (const fila of await filas.all()) {
        const celdas = fila.getByRole("cell");
        leidos.push(
          [await valorDeCelda(celdas.nth(1)), await valorDeCelda(celdas.nth(2)), await valorDeCelda(celdas.nth(3))].join("|"),
        );
      }
      expect(leidos.sort()).toEqual([...caso.vertices].sort());

      // Exactamente un vértice marcado "Óptimo", y es el esperado.
      const filasOptimas = filas.filter({ hasText: "Óptimo" });
      await expect(filasOptimas).toHaveCount(1);
      const celdasOptimo = filasOptimas.getByRole("cell");
      expect(await valorDeCelda(celdasOptimo.nth(1))).toBe(caso.optimo.x1);
      expect(await valorDeCelda(celdasOptimo.nth(2))).toBe(caso.optimo.x2);
      expect(await valorDeCelda(celdasOptimo.nth(3))).toBe(caso.optimo.z);
    });
  }
});
