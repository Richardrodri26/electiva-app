/**
 * Pruebas de `almacen-historial.ts` (tarea T7.1): deduplicación por `hashModelo`, límite de
 * 20 entradas, tolerancia a que `localStorage` no esté disponible, y que volver a resolver
 * un modelo ya guardado lo actualiza (y conserva el título) en vez de duplicarlo.
 *
 * `Storage` falso en memoria, igual que `lib/almacenamiento.test.ts` (entorno "node" de
 * `vitest.config.mts`: no hay `localStorage` real, por eso cada test que lo necesita hace
 * `vi.stubGlobal`).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { esquemaModelo } from "@/dominio/modelo/esquemas";
import { formatearFuncionObjetivoTexto } from "@/dominio/modelo/formato";
import { hashModelo } from "@/dominio/modelo/serializacion";
import type { ModeloLineal } from "@/dominio/modelo/tipos";

import {
  CLAVE_HISTORIAL,
  LIMITE_HISTORIAL,
  eliminarEntrada,
  guardarEnHistorial,
  obtenerHistorial,
  renombrarEntrada,
} from "./almacen-historial";

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

/** Modelo mínimo válido (2 variables, 1 restricción); `valor` varía el objetivo para dar un hash distinto. */
function crearModelo(valor: string, titulo?: string): ModeloLineal {
  return esquemaModelo.parse({
    version: 1,
    titulo,
    origen: "editor",
    variables: [
      { nombre: "x1", etiqueta: "x1", definicion: "x1 = variable de decisión 1." },
      { nombre: "x2", etiqueta: "x2", definicion: "x2 = variable de decisión 2." },
    ],
    objetivo: { sentido: "max", coeficientes: [valor, "1"], simbolo: "Z" },
    restricciones: [{ numero: 1, nombre: "Restricción 1", coeficientes: ["1", "1"], relacion: "<=", limite: "10" }],
    naturaleza: "fraccionaria",
  });
}

describe("almacen-historial", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda una entrada nueva con el título por defecto (función objetivo)", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modelo = crearModelo("3");

    const entrada = guardarEnHistorial(modelo, "optimo");

    expect(entrada.hash).toBe(hashModelo(modelo));
    expect(entrada.titulo).toBe(formatearFuncionObjetivoTexto(modelo));
    expect(entrada.estado).toBe("optimo");
    expect(obtenerHistorial()).toHaveLength(1);
  });

  it("deduplica por hashModelo: resolver el mismo modelo de nuevo actualiza la entrada, no la duplica, y la mueve al frente", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modeloA = crearModelo("1");
    const modeloB = crearModelo("2");

    guardarEnHistorial(modeloA, "optimo");
    guardarEnHistorial(modeloB, "infactible");
    const historialAntes = obtenerHistorial();
    expect(historialAntes).toHaveLength(2);
    expect(historialAntes[0]?.hash).toBe(hashModelo(modeloB));

    // Se vuelve a resolver A: no debe duplicarse, y debe pasar a ser el más reciente.
    guardarEnHistorial(modeloA, "optimo");
    const historialDespues = obtenerHistorial();
    expect(historialDespues).toHaveLength(2);
    expect(historialDespues[0]?.hash).toBe(hashModelo(modeloA));
    expect(historialDespues[1]?.hash).toBe(hashModelo(modeloB));
  });

  it("conserva el título renombrado al volver a resolver (autoguardado) el mismo modelo", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modelo = crearModelo("5");

    const entrada = guardarEnHistorial(modelo, "optimo");
    renombrarEntrada(entrada.hash, "Mi modelo favorito");

    // Autoguardado SIN título explícito: no debe pisar el nombre que el usuario puso.
    guardarEnHistorial(modelo, "optimo");

    const historial = obtenerHistorial();
    expect(historial).toHaveLength(1);
    expect(historial[0]?.titulo).toBe("Mi modelo favorito");
  });

  it('"Guardar con nombre" (título explícito) sobrescribe el título anterior', () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modelo = crearModelo("7");

    guardarEnHistorial(modelo, "optimo");
    const entrada = guardarEnHistorial(modelo, "optimo", "Nombre elegido a mano");

    expect(entrada.titulo).toBe("Nombre elegido a mano");
    expect(obtenerHistorial()[0]?.titulo).toBe("Nombre elegido a mano");
  });

  it("guarda modelos infactibles y no acotados (no solo los óptimos)", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modeloInfactible = crearModelo("9");
    const modeloNoAcotado = crearModelo("11");

    guardarEnHistorial(modeloInfactible, "infactible");
    guardarEnHistorial(modeloNoAcotado, "no_acotado");

    const estados = obtenerHistorial().map((entrada) => entrada.estado);
    expect(estados).toContain("infactible");
    expect(estados).toContain("no_acotado");
  });

  it(`conserva como máximo ${LIMITE_HISTORIAL} entradas: descarta la más vieja`, () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());

    const modelos = Array.from({ length: LIMITE_HISTORIAL + 1 }, (_, indice) => crearModelo(String(indice + 1)));
    for (const modelo of modelos) {
      guardarEnHistorial(modelo, "optimo");
    }

    const historial = obtenerHistorial();
    expect(historial).toHaveLength(LIMITE_HISTORIAL);
    // El primero guardado (índice 0) se descartó; el último queda al frente.
    expect(historial.some((entrada) => entrada.hash === hashModelo(modelos[0]!))).toBe(false);
    expect(historial[0]?.hash).toBe(hashModelo(modelos[LIMITE_HISTORIAL]!));
  });

  it("eliminarEntrada quita solo la entrada indicada", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    const modeloA = crearModelo("13");
    const modeloB = crearModelo("17");
    const entradaA = guardarEnHistorial(modeloA, "optimo");
    guardarEnHistorial(modeloB, "optimo");

    eliminarEntrada(entradaA.hash);

    const historial = obtenerHistorial();
    expect(historial).toHaveLength(1);
    expect(historial[0]?.hash).toBe(hashModelo(modeloB));
  });

  it("renombrarEntrada no lanza ni cambia nada si el hash no existe", () => {
    vi.stubGlobal("localStorage", crearAlmacenFalso());
    guardarEnHistorial(crearModelo("19"), "optimo");

    expect(() => renombrarEntrada("hash-inexistente", "nuevo título")).not.toThrow();
    expect(obtenerHistorial()).toHaveLength(1);
  });

  it("sin localStorage disponible (ej. SSR o modo privado): no lanza y se comporta como historial vacío", () => {
    // Sin `vi.stubGlobal`: en el entorno "node" de vitest no existe `localStorage` (igual que
    // `lib/almacenamiento.test.ts`).
    const modelo = crearModelo("23");

    expect(obtenerHistorial()).toEqual([]);
    expect(() => guardarEnHistorial(modelo, "optimo")).not.toThrow();
    expect(obtenerHistorial()).toEqual([]);
    expect(() => renombrarEntrada("cualquiera", "x")).not.toThrow();
    expect(() => eliminarEntrada("cualquiera")).not.toThrow();
  });

  it(`guarda bajo la clave "${CLAVE_HISTORIAL}" de localStorage`, () => {
    const almacen = crearAlmacenFalso();
    vi.stubGlobal("localStorage", almacen);

    guardarEnHistorial(crearModelo("29"), "optimo");

    expect(almacen.getItem(CLAVE_HISTORIAL)).not.toBeNull();
  });
});
