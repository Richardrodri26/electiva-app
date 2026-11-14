import { expect, test, type Page } from "@playwright/test";

/**
 * Empezar un ejercicio nuevo no debe traer los datos del anterior: al resolver con éxito el
 * borrador (asistente o editor) se descarta; "← Editar" desde los resultados sí conserva el
 * modelo (viaja en `?m=`). El borrador sin terminar sigue ofreciéndose.
 */

async function completarAsistenteHastaRevisar(page: Page): Promise<void> {
  await page.goto("/modelo/asistente");

  await page.getByRole("radio", { name: "Productos" }).click();
  await page.getByLabel("¿Cómo desea llamar a la opción 1?").fill("Mesas");
  await page.getByLabel("¿Cómo desea llamar a la opción 2?").fill("Sillas");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/paso=2/);
  await page.getByRole("radio", { name: "Mayor utilidad" }).click();
  await page.getByLabel("¿Cuánta ganancia deja cada unidad de «Mesas»?").fill("4");
  await page.getByLabel("¿Cuánta ganancia deja cada unidad de «Sillas»?").fill("3");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/paso=3/);
  await page.getByLabel("¿Cuánto de «Presupuesto» usa cada unidad de «Mesas»?").fill("2");
  await page.getByLabel("¿Cuánto de «Presupuesto» usa cada unidad de «Sillas»?").fill("1");
  await page.getByLabel("¿Cuánto hay disponible como máximo de «Presupuesto»?").fill("12");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/paso=4/);
  await page.getByRole("radio", { name: "Deben ser unidades completas (enteras)" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/paso=5/);
}

async function irAInicio(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Programación lineal" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Ejercicio nuevo sin datos del anterior", () => {
  test.setTimeout(90_000);

  test("asistente: tras resolver, volver a empezar arranca vacío y sin banner", async ({ page }) => {
    await completarAsistenteHastaRevisar(page);
    await page.getByRole("button", { name: "Resolver modelo" }).click();
    await expect(page).toHaveURL(/\/resolver\?m=.+&vista=modelo/);

    await irAInicio(page);
    await page.getByRole("link", { name: "Empezar con preguntas" }).click();

    await expect(page).toHaveURL(/\/modelo\/asistente/);
    await expect(page.getByLabel("¿Cómo desea llamar a la opción 1?")).toHaveValue("");
    await expect(page.getByText("Tiene un modelo sin terminar")).toHaveCount(0);
  });

  test("asistente: un borrador sin terminar sigue ofreciendo retomarlo", async ({ page }) => {
    await page.goto("/modelo/asistente");
    await page.getByRole("radio", { name: "Productos" }).click();
    await page.getByLabel("¿Cómo desea llamar a la opción 1?").fill("Mesas");
    await page.getByLabel("¿Cómo desea llamar a la opción 2?").fill("Sillas");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/paso=2/);

    await irAInicio(page);
    await page.getByRole("link", { name: "Empezar con preguntas" }).click();

    await expect(page.getByText("Tiene un modelo sin terminar")).toBeVisible();
    await page.getByRole("button", { name: "Retomar el modelo" }).click();
    await expect(page.getByRole("radio", { name: "Mayor utilidad" })).toBeVisible();
  });

  test("editor: tras resolver, entrar de nuevo abre el formulario en blanco", async ({ page }) => {
    await page.goto("/modelo/editor");
    await page.getByRole("button", { name: "Cargar ejemplo" }).click();
    await page.getByRole("menuitem", { name: "Clase · ejemplo principal" }).click();
    await expect(page.getByLabel("Coeficiente de x1 en Z")).toHaveValue("3");

    // Se resuelve sin esperar el autoguardado: el borrador pendiente no debe resucitar.
    await page.getByRole("button", { name: "Resolver con Simplex" }).click();
    await expect(page).toHaveURL(/\/resolver\?.*vista=simplex/);

    await irAInicio(page);
    await page.getByRole("link", { name: "Abrir editor" }).click();

    await expect(page).toHaveURL(/\/modelo\/editor$/);
    await expect(page.getByLabel("Coeficiente de x1 en Z")).toHaveValue("");
  });

  test("editor: \"← Editar\" desde los resultados conserva el modelo", async ({ page }) => {
    await page.goto("/modelo/editor");
    await page.getByRole("button", { name: "Cargar ejemplo" }).click();
    await page.getByRole("menuitem", { name: "Clase · ejemplo principal" }).click();
    await page.getByRole("button", { name: "Resolver con Simplex" }).click();
    await expect(page).toHaveURL(/\/resolver\?.*vista=simplex/);

    await page.getByRole("link", { name: "Editar" }).click();

    await expect(page).toHaveURL(/\/modelo\/editor\?m=/);
    await expect(page.getByLabel("Coeficiente de x1 en Z")).toHaveValue("3");
  });
});
