import { expect, test } from "@playwright/test";

/**
 * T8.2 · escenario 2: editor con el ejemplo principal de clase (C1 de docs/08) → Simplex →
 * iteración 2 → recargar → la iteración 2 se conserva (el estado vive en `?iter=`).
 *
 * Valores esperados (docs/08 C1): tablas 0, 1 y 2; traza `x1 / S2 / 3` → `x2 / S3 / 16/3`;
 * tabla tras la iteración 1 con razones 69/19 y 21/8; solución Z = 57/2, x1 = 31/4, x2 = 21/8.
 */

test.describe("Editor → Simplex", () => {
  test.setTimeout(90_000);

  test("navegar a la iteración 2 y recargar conserva la iteración", async ({ page }) => {
    await page.goto("/modelo/editor");

    await page.getByRole("button", { name: "Cargar ejemplo" }).click();
    await page.getByRole("menuitem", { name: "Clase · ejemplo principal" }).click();
    await expect(page.getByLabel("Coeficiente de x1 en Z")).toHaveValue("3");

    await page.getByRole("button", { name: "Resolver con Simplex" }).click();
    await expect(page).toHaveURL(/\/resolver\?.*vista=simplex/);

    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("Tabla 1 de 3, iteración 0")).toBeVisible();

    // Iteración 1: razones 69/19 y 21/8 (docs/08, comparar con la diapositiva 27).
    await panel.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/iter=1/);
    await expect(panel.getByText("Tabla 2 de 3, iteración 1")).toBeVisible();
    const celdasDeLaTabla = panel.getByRole("table").getByRole("cell");
    await expect(celdasDeLaTabla.filter({ hasText: /^69\/19$/ })).toHaveCount(1);
    await expect(celdasDeLaTabla.filter({ hasText: /^21\/8/ })).toHaveCount(1);

    // Iteración 2: tabla final, óptima.
    await panel.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/iter=2/);
    await expect(panel.getByText("Tabla 3 de 3, iteración 2")).toBeVisible();

    const optimo = panel.getByRole("alert").filter({ hasText: "Solución óptima" });
    await expect(optimo).toContainText("Z = 57/2");
    await expect(optimo).toContainText(/x1\s*=\s*31\/4/);
    await expect(optimo).toContainText(/x2\s*=\s*21\/8/);

    await page.reload();

    await expect(page).toHaveURL(/iter=2/);
    await expect(page.getByRole("tabpanel").getByText("Tabla 3 de 3, iteración 2")).toBeVisible();
    await expect(page.getByRole("tabpanel").getByRole("alert").filter({ hasText: "Solución óptima" })).toContainText(
      "Z = 57/2",
    );
  });
});
