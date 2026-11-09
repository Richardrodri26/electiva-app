/**
 * Pruebas de `serializacion.ts` — docs/03-dominio-y-validacion.md §6:
 * "Serialización: ida y vuelta para todos los casos de 08-casos-de-prueba.md;
 * string inválido → error."
 *
 * Los casos de `__fixtures__/casos.ts` usan el tipo local `ModeloCaso` (ver el
 * comentario de cabecera de ese archivo: son "tipos locales temporales" porque ahí
 * las variables son solo nombres `string[]` y las restricciones no tienen
 * etiqueta/definición). Para probar la serialización del `ModeloLineal` real se
 * adapta cada caso a un modelo de origen `'editor'` completo y válido.
 */

import { describe, expect, it } from "vitest";
import { CASOS, type CasoPrueba } from "../__fixtures__/casos";
import { esquemaModelo } from "./esquemas";
import { deserializarModelo, hashModelo, serializarModelo } from "./serializacion";
import type { ModeloLineal } from "./tipos";

/** Adapta un `CasoPrueba` (tipo local de los fixtures) a un `ModeloLineal` válido del dominio. */
function casoAModelo(caso: CasoPrueba, titulo?: string): ModeloLineal {
  const candidato = {
    version: 1 as const,
    titulo,
    origen: "editor" as const,
    variables: caso.modelo.variables.map((nombre, indice) => ({
      nombre,
      etiqueta: `Opcion${indice + 1}`,
      definicion: `${nombre} = variable de decisión ${indice + 1}.`,
    })),
    objetivo: {
      sentido: caso.modelo.sentido,
      coeficientes: caso.modelo.objetivo.coeficientes,
      simbolo: "Z" as const,
    },
    restricciones: caso.modelo.restricciones.map((restriccion, indice) => ({
      numero: indice + 1,
      nombre: `Restriccion${indice + 1}`,
      coeficientes: restriccion.coeficientes,
      relacion: restriccion.relacion,
      limite: restriccion.limite,
    })),
    naturaleza: caso.modelo.naturaleza,
  };
  return esquemaModelo.parse(candidato);
}

describe("serializarModelo / deserializarModelo", () => {
  it.each(CASOS.map((caso) => [caso.id, caso] as const))(
    "ida y vuelta estable para %s",
    (_id, caso) => {
      const modelo = casoAModelo(caso, "Un título de prueba");
      const serializado = serializarModelo(modelo);

      expect(serializado.length).toBeLessThanOrEqual(6000);
      // Estabilidad: el mismo modelo siempre produce el mismo string.
      expect(serializarModelo(modelo)).toBe(serializado);

      const resultado = deserializarModelo(serializado);
      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.valor).toEqual(modelo);
      }
    },
  );

  it("rechaza un string vacío sin lanzar", () => {
    const resultado = deserializarModelo("");
    expect(resultado).toEqual({ ok: false, error: expect.any(String) });
  });

  it("rechaza base64url corrupto sin lanzar", () => {
    const resultado = deserializarModelo("no-es-base64-válido-!!!");
    expect(resultado.ok).toBe(false);
  });

  it("rechaza un string más largo que el límite sin lanzar", () => {
    const resultado = deserializarModelo("a".repeat(6001));
    expect(resultado.ok).toBe(false);
  });

  it("rechaza JSON bien formado que no valida contra esquemaModelo", () => {
    const json = JSON.stringify({ foo: "bar" });
    const bytes = new TextEncoder().encode(json);
    let binario = "";
    for (const byte of bytes) binario += String.fromCharCode(byte);
    const base64Url = btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const resultado = deserializarModelo(base64Url);
    expect(resultado.ok).toBe(false);
  });

  it("decodifica correctamente texto con tildes/ñ (UTF-8)", () => {
    const caso = casoAModelo(CASOS[0]!, "Título con ñ, tildes: áéíóú");
    const resultado = deserializarModelo(serializarModelo(caso));
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.valor.titulo).toBe("Título con ñ, tildes: áéíóú");
    }
  });
});

describe("hashModelo", () => {
  it("no cambia si solo cambia el título", () => {
    const sinTitulo = casoAModelo(CASOS[0]!);
    const conTitulo = casoAModelo(CASOS[0]!, "Cualquier título");
    const conOtroTitulo = casoAModelo(CASOS[0]!, "Otro título distinto");

    expect(hashModelo(sinTitulo)).toBe(hashModelo(conTitulo));
    expect(hashModelo(conTitulo)).toBe(hashModelo(conOtroTitulo));

    // Pero el string serializado (?m=) sí difiere, porque el título viaja en el JSON.
    expect(serializarModelo(sinTitulo)).not.toBe(serializarModelo(conTitulo));
  });

  it("cambia si cambia algo que no sea el título", () => {
    const modeloA = casoAModelo(CASOS[0]!, "Mismo título");
    const modeloB = casoAModelo(CASOS[1]!, "Mismo título");

    expect(hashModelo(modeloA)).not.toBe(hashModelo(modeloB));
  });

  it("es estable: el mismo modelo da siempre el mismo hash", () => {
    const modelo = casoAModelo(CASOS[2]!, "Título");
    expect(hashModelo(modelo)).toBe(hashModelo(modelo));
  });
});
