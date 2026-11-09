import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { borrar, guardar, leer } from "./almacenamiento";

/** `Storage` mínimo en memoria, para no depender de jsdom (`vitest.config.mts`: `environment: "node"`). */
function crearAlmacenFalso(): Storage {
  const datos = new Map<string, string>();
  return {
    getItem: (clave: string) => (datos.has(clave) ? datos.get(clave)! : null),
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
    clear: () => {
      datos.clear();
    },
    key: () => null,
    get length() {
      return datos.size;
    },
  } as Storage;
}

const esquema = z.object({ n: z.number() });

describe("almacenamiento", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda y lee de vuelta un valor que cumple el esquema", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());

    expect(guardar("clave", { n: 1 })).toBe(true);
    expect(leer("clave", esquema)).toEqual({ n: 1 });
  });

  it("lee null si no hay nada guardado bajo esa clave", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());

    expect(leer("inexistente", esquema)).toBeNull();
  });

  it("lee null si el contenido no es JSON válido", () => {
    const almacen = crearAlmacenFalso();
    almacen.setItem("clave", "{no es json");
    vi.stubGlobal("localStorage", almacen);

    expect(leer("clave", esquema)).toBeNull();
  });

  it("lee null si el contenido no cumple el esquema (dato corrupto o de otra versión)", () => {
    const almacen = crearAlmacenFalso();
    almacen.setItem("clave", JSON.stringify({ n: "no es un número" }));
    vi.stubGlobal("localStorage", almacen);

    expect(leer("clave", esquema)).toBeNull();
  });

  it("borra una clave guardada", () => {
    const almacen = crearAlmacenFalso();
    vi.stubGlobal("localStorage", almacen);

    guardar("clave", { n: 1 });
    borrar("clave");

    expect(leer("clave", esquema)).toBeNull();
  });

  it("borrar una clave inexistente no lanza", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());

    expect(() => borrar("inexistente")).not.toThrow();
  });

  it("sin localStorage disponible (ej. SSR): leer devuelve null, guardar devuelve false, borrar no lanza", () => {
    // No se hace `stubGlobal`: en el entorno "node" de vitest, `localStorage` no existe.
    expect(leer("clave", esquema)).toBeNull();
    expect(guardar("clave", { n: 1 })).toBe(false);
    expect(() => borrar("clave")).not.toThrow();
  });

  it("guardar devuelve false si localStorage lanza al escribir (ej. QuotaExceededError)", () => {
    const almacen = crearAlmacenFalso();
    almacen.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    vi.stubGlobal("localStorage", almacen);

    expect(guardar("clave", { n: 1 })).toBe(false);
  });

  it("leer devuelve null si localStorage lanza al leer", () => {
    const almacen = crearAlmacenFalso();
    almacen.getItem = () => {
      throw new Error("falla simulada");
    };
    vi.stubGlobal("localStorage", almacen);

    expect(leer("clave", esquema)).toBeNull();
  });
});
