import { expect, test } from "@playwright/test";

/**
 * T8.2 · escenario 1: asistente completo (pasos 1 a 5) → "Resolver modelo" →
 * `/resolver?m=…&vista=modelo` → pestaña Interpretación.
 *
 * Modelo: C3 de docs/08 (max Z = 4x1 + 3x2; 2x1 + x2 ≤ 12; x1 + x2 ≤ 7) expresado en
 * lenguaje cotidiano: x1 = Mesas, x2 = Sillas, meta "Mayor utilidad".
 * Solución verificada (docs/08): x1 = 5, x2 = 2, Z = 26.
 *
 * Los textos de las preguntas son los literales de `features/asistente/textos.ts`.
 * La interpretación usa el futuro (PROGRESS.md decisión 16): "Se producirán …".
 */

test.describe("Asistente completo", () => {
  test.setTimeout(120_000);

  test("de la primera pregunta a la interpretación del resultado", async ({ page }) => {
    await page.goto("/modelo/asistente");

    // Paso 1 · Qué desea determinar.
    await page.getByRole("radio", { name: "Productos" }).click();
    await page.getByLabel("¿Cómo desea llamar a la opción 1?").fill("Mesas");
    await page.getByLabel("¿Cómo desea llamar a la opción 2?").fill("Sillas");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 2 · Qué desea conseguir.
    await expect(page).toHaveURL(/paso=2/);
    await page.getByRole("radio", { name: "Mayor utilidad" }).click();
    await page.getByLabel("¿Cuánto aporta o cuesta cada Mesas?").fill("4");
    await page.getByLabel("¿Cuánto aporta o cuesta cada Sillas?").fill("3");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 3 · Limitaciones. La primera es "Presupuesto" (tipo por defecto).
    await expect(page).toHaveURL(/paso=3/);
    await page.getByLabel('¿Cuánto utiliza o aporta cada Mesas en "Presupuesto"?').fill("2");
    await page.getByLabel('¿Cuánto utiliza o aporta cada Sillas en "Presupuesto"?').fill("1");
    await page
      .getByLabel('¿Cuál es la cantidad disponible, requerida o exacta para "Presupuesto"?')
      .fill("12");

    // Segunda limitación: se agrega colapsada; se abre y se cambia el tipo a "Horas".
    await page.getByRole("button", { name: "Agregar limitación" }).click();
    await page.getByRole("button", { name: /^Limitación 2/ }).click();
    const limitacion2 = page.getByRole("region", { name: /^Limitación 2/ });
    await limitacion2.getByRole("combobox", { name: "¿Qué tipo de limitación desea agregar?" }).click();
    await page.getByRole("option", { name: "Horas" }).click();
    await limitacion2.getByLabel('¿Cuánto utiliza o aporta cada Mesas en "Horas"?').fill("1");
    await limitacion2.getByLabel('¿Cuánto utiliza o aporta cada Sillas en "Horas"?').fill("1");
    await limitacion2.getByLabel('¿Cuál es la cantidad disponible, requerida o exacta para "Horas"?').fill("7");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 4 · Naturaleza de las cantidades.
    await expect(page).toHaveURL(/paso=4/);
    await page.getByRole("radio", { name: "Deben ser unidades completas (enteras)" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Paso 5 · Revisar.
    await expect(page).toHaveURL(/paso=5/);
    await expect(page.getByLabel("Resumen del modelo")).toContainText("Función objetivo");
    await page.getByRole("button", { name: "Resolver modelo" }).click();

    // Resultados: llega por la vista "modelo".
    await expect(page).toHaveURL(/\/resolver\?m=.+&vista=modelo/);
    await page.getByRole("tab", { name: "Interpretación" }).click();
    await expect(page).toHaveURL(/vista=interpretacion/);

    const panel = page.getByRole("tabpanel");
    await expect(panel.getByRole("heading", { name: "Qué conviene hacer" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Cómo quedan sus recursos" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Resultado" })).toBeVisible();

    // Variables en futuro, sin la unidad "Unidades".
    await expect(panel.getByText("Se producirán 5 de Mesas.")).toBeVisible();
    await expect(panel.getByText("Se producirán 2 de Sillas.")).toBeVisible();
    // Recursos (ambos se agotan en el vértice (5, 2)).
    await expect(panel.getByText("Se usa todo lo disponible de «Presupuesto».")).toBeVisible();
    await expect(panel.getByText("Se usa todo lo disponible de «Horas».")).toBeVisible();
    // Objetivo con la meta elegida.
    await expect(panel.getByText("Mayor utilidad: Z = 26")).toBeVisible();
  });

  test("Cancelar en el paso 5 borra el borrador y vuelve al inicio", async ({ page }) => {
    await page.goto("/modelo/asistente");

    await page.getByRole("radio", { name: "Productos" }).click();
    await page.getByLabel("¿Cómo desea llamar a la opción 1?").fill("Mesas");
    await page.getByLabel("¿Cómo desea llamar a la opción 2?").fill("Sillas");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/paso=2/);
    await page.getByRole("radio", { name: "Mayor utilidad" }).click();
    await page.getByLabel("¿Cuánto aporta o cuesta cada Mesas?").fill("4");
    await page.getByLabel("¿Cuánto aporta o cuesta cada Sillas?").fill("3");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/paso=3/);
    await page.getByLabel('¿Cuánto utiliza o aporta cada Mesas en "Presupuesto"?').fill("2");
    await page.getByLabel('¿Cuánto utiliza o aporta cada Sillas en "Presupuesto"?').fill("1");
    await page
      .getByLabel('¿Cuál es la cantidad disponible, requerida o exacta para "Presupuesto"?')
      .fill("12");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/paso=4/);
    await page.getByRole("radio", { name: "Deben ser unidades completas (enteras)" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page).toHaveURL(/paso=5/);
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();

    await expect(page).toHaveURL("/");
  });
});
