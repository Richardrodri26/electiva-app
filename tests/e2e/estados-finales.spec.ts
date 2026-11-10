import { expect, test } from "@playwright/test";

import { C7_INFACTIBLE, C8_NO_ACOTADO, urlResolver } from "./modelos";

/**
 * T8.2 · escenario 4: modelo infactible (C7) y no acotado (C8) de docs/08-casos-de-prueba.md.
 * Los textos son los de docs/06-ux-ui.md §4 y los que renderiza la UI en la pestaña Simplex,
 * en la pestaña Método gráfico y en la Interpretación.
 */

test.describe("Estados finales sin solución", () => {
  test.setTimeout(90_000);

  test("C7 infactible: la pestaña Simplex lo explica y nombra la limitación en conflicto", async ({ page }) => {
    await page.goto(urlResolver(C7_INFACTIBLE, "simplex"));

    // El aviso final aparece en la última tabla del stepper.
    await page.getByRole("navigation", { name: "Iteraciones del Simplex" }).getByRole("button").last().click();

    const panel = page.getByRole("tabpanel");
    const alerta = panel.getByRole("alert").filter({ hasText: "Infactible" });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText(
      "Ningún punto cumple todas las restricciones a la vez. Revise los límites de Restricción 2.",
    );
    await expect(panel.getByText("Infactible", { exact: true }).first()).toBeVisible();
  });

  test("C7 infactible: el método gráfico no encuentra puntos factibles", async ({ page }) => {
    await page.goto(urlResolver(C7_INFACTIBLE, "grafico"));

    const alerta = page.getByRole("tabpanel").getByRole("alert").filter({
      hasText: "No hay ningún punto que cumpla todo a la vez",
    });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText("Revise los límites de sus restricciones.");
  });

  test("C7 infactible: la interpretación avisa que no hay solución", async ({ page }) => {
    await page.goto(urlResolver(C7_INFACTIBLE, "interpretacion"));

    await expect(page.getByRole("tabpanel").getByText("No hay solución que interpretar")).toBeVisible();
  });

  test("C8 no acotado: la pestaña Simplex avisa que Z puede crecer sin límite", async ({ page }) => {
    await page.goto(urlResolver(C8_NO_ACOTADO, "simplex"));

    await page.getByRole("navigation", { name: "Iteraciones del Simplex" }).getByRole("button").last().click();

    const panel = page.getByRole("tabpanel");
    const alerta = panel.getByRole("alert").filter({ hasText: "No acotado" });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText("Z puede crecer sin límite: falta alguna limitación. Revise sus restricciones.");
  });

  test("C8 no acotado: el método gráfico avisa que Z puede crecer sin límite", async ({ page }) => {
    await page.goto(urlResolver(C8_NO_ACOTADO, "grafico"));

    const alerta = page.getByRole("tabpanel").getByRole("alert").filter({ hasText: "Z puede crecer sin límite" });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText("Falta alguna limitación: revise sus restricciones.");
  });

  test("C8 no acotado: la interpretación avisa que no hay solución", async ({ page }) => {
    await page.goto(urlResolver(C8_NO_ACOTADO, "interpretacion"));

    await expect(page.getByRole("tabpanel").getByText("No hay solución que interpretar")).toBeVisible();
  });
});
