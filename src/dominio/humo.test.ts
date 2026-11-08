import { describe, expect, it } from "vitest";

// Prueba trivial: solo confirma que el entorno de pruebas (Vitest + alias @)
// está correctamente configurado. La lógica real del dominio llega en las
// siguientes tareas (ver docs/07-plan-de-implementacion.md).
describe("entorno de pruebas", () => {
  it("ejecuta pruebas con Vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
