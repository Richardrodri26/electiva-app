/**
 * Parseo de texto a `Fraccion` (`dominio/aritmetica/parseo.ts`).
 *
 * Convierte texto a `Fraccion` sin pasar nunca por `Number()` para el
 * resultado final: los dígitos se interpretan como `bigint`.
 * Ver docs/03-dominio-y-validacion.md §1.3.
 *
 * Este módulo asume que la validación de "forma" del texto (qué patrones son
 * aceptables para cada pantalla) ya la hizo `dominio/modelo/esquemas.ts` con
 * Zod (regla de oro #3: Zod es la única fuente de validación). Acá se cubre
 * un superconjunto razonable de esos patrones y se lanza `ErrorTextoInvalido`
 * tipado para cualquier texto que no se pueda interpretar como fracción
 * exacta — ver nota de ambigüedad en el resumen final sobre este contrato.
 */

import { Fraccion } from "./fraccion";

/** Se lanza cuando el texto no tiene una forma reconocible como número o fracción. */
export class ErrorTextoInvalido extends Error {
  constructor(texto: string) {
    super(`"${texto}" no es un número o fracción válida.`);
    this.name = "ErrorTextoInvalido";
  }
}

// "-2/3", "1/3": signo opcional, enteros, barra, enteros (sin signo en el denominador).
const PATRON_FRACCION = /^(-)?(\d+)\/(\d+)$/;

// "-3", "12", "12,5", "12.5", "0.125": signo opcional, parte entera, separador
// decimal opcional ('.' o ',') seguido de la parte decimal.
const PATRON_DECIMAL = /^(-)?(\d+)(?:[.,](\d+))?$/;

/**
 * Convierte texto a `Fraccion` de forma exacta (sin `Number()`).
 * Lanza `ErrorTextoInvalido` si el texto no matchea ningún formato soportado,
 * y `ErrorDivisionPorCero` (de `Fraccion`) si el denominador de una fracción
 * de texto es `0`.
 */
export function parsearFraccion(texto: string): Fraccion {
  const limpio = texto.trim();

  const comoFraccion = PATRON_FRACCION.exec(limpio);
  if (comoFraccion !== null) {
    const [, signo, numeradorTexto, denominadorTexto] = comoFraccion;
    // numeradorTexto y denominadorTexto son grupos obligatorios de PATRON_FRACCION
    // (`\d+`, no opcionales): si el regex matcheó, siempre están definidos.
    const numerador = BigInt(numeradorTexto!);
    const denominador = BigInt(denominadorTexto!);
    const fraccion = Fraccion.de(signo === "-" ? -numerador : numerador, denominador);
    return fraccion;
  }

  const comoDecimal = PATRON_DECIMAL.exec(limpio);
  if (comoDecimal !== null) {
    const [, signo, parteEntera, parteDecimal] = comoDecimal;
    // parteDecimal es el único grupo opcional de PATRON_DECIMAL (viene de "(?:...)?");
    // parteEntera es obligatorio (`\d+`): si el regex matcheó, siempre está definido.
    const digitosDecimal = parteDecimal ?? "";
    const digitos = `${parteEntera!}${digitosDecimal}`;
    const numerador = BigInt(digitos);
    const denominador = 10n ** BigInt(digitosDecimal.length);
    const fraccion = Fraccion.de(signo === "-" ? -numerador : numerador, denominador);
    return fraccion;
  }

  throw new ErrorTextoInvalido(texto);
}
