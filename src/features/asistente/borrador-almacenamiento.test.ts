import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { borrar, guardar, leer } from "@/lib/almacenamiento";

import {
  CLAVE_BORRADOR_ASISTENTE,
  esquemaBorradorGuardado,
  obtenerInstantaneaBorradorGuardado,
} from "./borrador-almacenamiento";
import { crearBorradorAsistente } from "./estado";

/** `localStorage` falso (entorno de prueba `node`, sin `localStorage` real) — alcanza
 * con implementar lo que usa `lib/almacenamiento.ts` (`getItem`/`setItem`/`removeItem`). */
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
    vi.restoreAllMocks();
  });

  it("guarda y vuelve a leer el mismo borrador, paso y pasoMaximoAlcanzado", () => {
    const borrador = crearBorradorAsistente();
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador, paso: 3, pasoMaximoAlcanzado: 4 });

    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toEqual({ borrador, paso: 3, pasoMaximoAlcanzado: 4 });
  });

  it("borra el borrador guardado", () => {
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador: crearBorradorAsistente(), paso: 2, pasoMaximoAlcanzado: 2 });
    borrar(CLAVE_BORRADOR_ASISTENTE);

    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();
    expect(localStorage.getItem(CLAVE_BORRADOR_ASISTENTE)).toBeNull();
  });

  it("devuelve null si no hay nada guardado", () => {
    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();
  });

  it("devuelve null (no lanza) si el valor guardado no es JSON válido", () => {
    localStorage.setItem(CLAVE_BORRADOR_ASISTENTE, "esto no es json");

    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();
  });

  it("devuelve null si el paso o el borrador guardados tienen una forma inválida", () => {
    localStorage.setItem(CLAVE_BORRADOR_ASISTENTE, JSON.stringify({ borrador: crearBorradorAsistente(), paso: 99 }));
    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();

    localStorage.setItem(
      CLAVE_BORRADOR_ASISTENTE,
      JSON.stringify({ borrador: { paso1: {} }, paso: 1, pasoMaximoAlcanzado: 1 }),
    );
    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();
  });

  it("obtenerInstantaneaBorradorGuardado devuelve la MISMA referencia si localStorage no cambió (contrato de useSyncExternalStore)", () => {
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador: crearBorradorAsistente(), paso: 2, pasoMaximoAlcanzado: 3 });

    const primera = obtenerInstantaneaBorradorGuardado();
    const segunda = obtenerInstantaneaBorradorGuardado();
    expect(primera).toBe(segunda);

    // Al cambiar el contenido, la referencia SÍ debe cambiar.
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador: crearBorradorAsistente(), paso: 3, pasoMaximoAlcanzado: 3 });
    const tercera = obtenerInstantaneaBorradorGuardado();
    expect(tercera).not.toBe(segunda);

    // Y al borrarlo, vuelve a `null` de forma estable.
    borrar(CLAVE_BORRADOR_ASISTENTE);
    expect(obtenerInstantaneaBorradorGuardado()).toBeNull();
    expect(obtenerInstantaneaBorradorGuardado()).toBeNull();
  });

  it("obtenerInstantaneaBorradorGuardado mantiene la referencia aunque se reescriba el MISMO contenido", () => {
    const datos = { borrador: crearBorradorAsistente(), paso: 2 as const, pasoMaximoAlcanzado: 2 as const };
    guardar(CLAVE_BORRADOR_ASISTENTE, datos);
    const primera = obtenerInstantaneaBorradorGuardado();

    // Mismo string crudo otra vez: no hay cambio real, así que la referencia no debe moverse.
    guardar(CLAVE_BORRADOR_ASISTENTE, datos);
    expect(obtenerInstantaneaBorradorGuardado()).toBe(primera);
  });

  it("obtenerInstantaneaBorradorGuardado no vuelve a parsear JSON mientras el contenido crudo no cambie", () => {
    guardar(CLAVE_BORRADOR_ASISTENTE, { borrador: crearBorradorAsistente(), paso: 1, pasoMaximoAlcanzado: 1 });
    obtenerInstantaneaBorradorGuardado(); // primera llamada: parsea una vez

    const parseo = vi.spyOn(JSON, "parse");
    obtenerInstantaneaBorradorGuardado();
    obtenerInstantaneaBorradorGuardado();

    expect(parseo).not.toHaveBeenCalled();
  });

  it("no lanza si localStorage no está disponible (SSR, modo privado, etc.)", () => {
    Reflect.deleteProperty(globalThis, "localStorage");

    expect(() =>
      guardar(CLAVE_BORRADOR_ASISTENTE, { borrador: crearBorradorAsistente(), paso: 1, pasoMaximoAlcanzado: 1 }),
    ).not.toThrow();
    expect(leer(CLAVE_BORRADOR_ASISTENTE, esquemaBorradorGuardado)).toBeNull();
    expect(() => borrar(CLAVE_BORRADOR_ASISTENTE)).not.toThrow();
    expect(obtenerInstantaneaBorradorGuardado()).toBeNull();
  });
});
