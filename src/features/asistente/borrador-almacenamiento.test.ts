import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  borrarBorrador,
  CLAVE_BORRADOR_ASISTENTE,
  guardarBorrador,
  leerBorrador,
  obtenerInstantaneaBorradorGuardado,
} from "./borrador-almacenamiento";
import { crearBorradorAsistente } from "./estado";

/** `localStorage` falso (entorno de prueba `node`, sin `localStorage` real) — alcanza
 * con implementar lo que usa `borrador-almacenamiento.ts` (`getItem`/`setItem`/`removeItem`). */
class LocalStorageFalso implements Storage {
  private almacen = new Map<string, string>();

  get length(): number {
    return this.almacen.size;
  }

  clear(): void {
    this.almacen.clear();
  }

  getItem(clave: string): string | null {
    return this.almacen.get(clave) ?? null;
  }

  key(indice: number): string | null {
    return [...this.almacen.keys()][indice] ?? null;
  }

  removeItem(clave: string): void {
    this.almacen.delete(clave);
  }

  setItem(clave: string, valor: string): void {
    this.almacen.set(clave, valor);
  }
}

describe("asistente — persistencia del borrador en localStorage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", { value: new LocalStorageFalso(), configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("guarda y vuelve a leer el mismo borrador, paso y pasoMaximoAlcanzado", () => {
    const borrador = crearBorradorAsistente();
    guardarBorrador({ borrador, paso: 3, pasoMaximoAlcanzado: 4 });

    expect(leerBorrador()).toEqual({ borrador, paso: 3, pasoMaximoAlcanzado: 4 });
  });

  it("borra el borrador guardado", () => {
    guardarBorrador({ borrador: crearBorradorAsistente(), paso: 2, pasoMaximoAlcanzado: 2 });
    borrarBorrador();

    expect(leerBorrador()).toBeNull();
    expect(localStorage.getItem(CLAVE_BORRADOR_ASISTENTE)).toBeNull();
  });

  it("devuelve null si no hay nada guardado", () => {
    expect(leerBorrador()).toBeNull();
  });

  it("devuelve null (no lanza) si el valor guardado no es JSON válido", () => {
    localStorage.setItem(CLAVE_BORRADOR_ASISTENTE, "esto no es json");

    expect(leerBorrador()).toBeNull();
  });

  it("devuelve null si el paso o el borrador guardados tienen una forma inválida", () => {
    localStorage.setItem(CLAVE_BORRADOR_ASISTENTE, JSON.stringify({ borrador: crearBorradorAsistente(), paso: 99 }));
    expect(leerBorrador()).toBeNull();

    localStorage.setItem(
      CLAVE_BORRADOR_ASISTENTE,
      JSON.stringify({ borrador: { paso1: {} }, paso: 1, pasoMaximoAlcanzado: 1 }),
    );
    expect(leerBorrador()).toBeNull();
  });

  it("obtenerInstantaneaBorradorGuardado devuelve la MISMA referencia si localStorage no cambió (contrato de useSyncExternalStore)", () => {
    guardarBorrador({ borrador: crearBorradorAsistente(), paso: 2, pasoMaximoAlcanzado: 3 });

    const primera = obtenerInstantaneaBorradorGuardado();
    const segunda = obtenerInstantaneaBorradorGuardado();
    expect(primera).toBe(segunda);

    // Al cambiar el contenido, la referencia SÍ debe cambiar.
    guardarBorrador({ borrador: crearBorradorAsistente(), paso: 3, pasoMaximoAlcanzado: 3 });
    const tercera = obtenerInstantaneaBorradorGuardado();
    expect(tercera).not.toBe(segunda);

    // Y al borrarlo, vuelve a `null` de forma estable.
    borrarBorrador();
    expect(obtenerInstantaneaBorradorGuardado()).toBeNull();
    expect(obtenerInstantaneaBorradorGuardado()).toBeNull();
  });

  it("no lanza si localStorage no está disponible (SSR, modo privado, etc.)", () => {
    Reflect.deleteProperty(globalThis, "localStorage");

    expect(() => guardarBorrador({ borrador: crearBorradorAsistente(), paso: 1, pasoMaximoAlcanzado: 1 })).not.toThrow();
    expect(leerBorrador()).toBeNull();
    expect(() => borrarBorrador()).not.toThrow();
  });
});
