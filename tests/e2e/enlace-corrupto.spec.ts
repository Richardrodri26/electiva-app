import { expect, test } from "@playwright/test";

/**
 * T8.2 · escenario 5: un enlace `/resolver` sin modelo válido muestra `ErrorAmable`
 * (docs/06-ux-ui.md §4, "URL inválida") con sus dos salidas.
 */

const MENSAJE = "Este enlace no contiene un modelo válido.";

const ENLACES_INVALIDOS = [
  { descripcion: "texto que no es un modelo (?m=basura)", ruta: "/resolver?m=basura" },
  { descripcion: "falta el parámetro ?m=", ruta: "/resolver" },
  { descripcion: "?m= vacío", ruta: "/resolver?m=" },
  { descripcion: "base64 válido pero JSON que no es un modelo", ruta: "/resolver?m=e30" },
];

test.describe("Enlace corrupto en /resolver", () => {
  test.setTimeout(90_000);

  for (const { descripcion, ruta } of ENLACES_INVALIDOS) {
    test(`muestra el error amable: ${descripcion}`, async ({ page }) => {
      await page.goto(ruta);

      const error = page.getByRole("alert").filter({ hasText: MENSAJE });
      await expect(error).toBeVisible();
      await expect(error.getByText("Algo no salió como esperábamos")).toBeVisible();
      await expect(error.getByRole("button", { name: "Abrir editor" })).toHaveAttribute("href", "/modelo/editor");
      await expect(error.getByRole("button", { name: "Ir al inicio" })).toHaveAttribute("href", "/");

      // No se renderiza la pantalla de resultados.
      await expect(page.getByRole("tab", { name: "Simplex" })).toHaveCount(0);
    });
  }

  test("'Abrir editor' lleva al editor", async ({ page }) => {
    await page.goto("/resolver?m=basura");
    await page.getByRole("button", { name: "Abrir editor" }).click();
    await expect(page).toHaveURL(/\/modelo\/editor$/);
  });

  test("'Ir al inicio' lleva a la pantalla de inicio", async ({ page }) => {
    await page.goto("/resolver");
    await page.getByRole("button", { name: "Ir al inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
