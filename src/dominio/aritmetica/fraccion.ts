/**
 * Aritmética exacta sobre fracciones (`dominio/aritmetica/fraccion.ts`).
 *
 * `Fraccion` es inmutable y está basada en `bigint`: nunca se usa `number`
 * para los cálculos, solo para `aNumero()`, que existe exclusivamente para
 * alimentar la gráfica (ver docs/03-dominio-y-validacion.md §1.1).
 *
 * Invariantes mantenidos siempre:
 * - `den > 0n`
 * - `mcd(|num|, den) = 1`
 * - el cero se representa siempre como `0/1`
 */

/** Se lanza al intentar dividir por cero o construir una fracción con denominador 0. */
export class ErrorDivisionPorCero extends Error {
  constructor(mensaje = "No se puede dividir por cero.") {
    super(mensaje);
    this.name = "ErrorDivisionPorCero";
  }
}

/**
 * Se lanza al construir una `Fraccion` desde un `number` que no es un entero
 * seguro (`Number.isSafeInteger`). Este error no está listado explícitamente
 * en docs/03 §1.1 (solo se especifica `ErrorDivisionPorCero`); se agrega como
 * contraparte tipada razonable — ver nota de ambigüedad en el resumen final.
 */
export class ErrorNumeroNoSeguro extends Error {
  constructor(valor: number) {
    super(`El número ${valor} no es un entero seguro (Number.isSafeInteger).`);
    this.name = "ErrorNumeroNoSeguro";
  }
}

/** Máximo común divisor (siempre no negativo) de dos bigint. */
function mcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const resto = x % y;
    x = y;
    y = resto;
  }
  return x;
}

/** Normaliza (num, den): reduce por el mcd y fuerza denominador positivo. */
function normalizar(numInicial: bigint, denInicial: bigint): { num: bigint; den: bigint } {
  if (denInicial === 0n) {
    throw new ErrorDivisionPorCero("No se puede crear una fracción con denominador cero.");
  }
  let num = numInicial;
  let den = denInicial;
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  if (num === 0n) {
    return { num: 0n, den: 1n };
  }
  const divisor = mcd(num, den);
  return { num: num / divisor, den: den / divisor };
}

/** Convierte `bigint | number` a `bigint`, rechazando `number` no enteros-seguros. */
function aBigIntSeguro(valor: bigint | number): bigint {
  if (typeof valor === "bigint") {
    return valor;
  }
  if (!Number.isSafeInteger(valor)) {
    throw new ErrorNumeroNoSeguro(valor);
  }
  return BigInt(valor);
}

/** Quita ceros sobrantes al final de una cadena de dígitos decimales. */
function quitarCerosSobrantes(digitos: string): string {
  let fin = digitos.length;
  while (fin > 0 && digitos.charAt(fin - 1) === "0") {
    fin -= 1;
  }
  return digitos.slice(0, fin);
}

export class Fraccion {
  readonly num: bigint;
  readonly den: bigint;

  private constructor(num: bigint, den: bigint) {
    this.num = num;
    this.den = den;
  }

  static readonly CERO = new Fraccion(0n, 1n);
  static readonly UNO = new Fraccion(1n, 1n);

  /** Construye y normaliza una fracción a partir de bigint ya normalizados o crudos. */
  private static crear(num: bigint, den: bigint): Fraccion {
    const { num: n, den: d } = normalizar(num, den);
    return new Fraccion(n, d);
  }

  /**
   * Construye una fracción a partir de enteros. `den` es opcional (default 1).
   * Si se pasa `number`, debe ser un entero seguro (`Number.isSafeInteger`);
   * de lo contrario lanza `ErrorNumeroNoSeguro`. Denominador 0 lanza
   * `ErrorDivisionPorCero`.
   */
  static de(num: bigint | number, den: bigint | number = 1n): Fraccion {
    const n = aBigIntSeguro(num);
    const d = aBigIntSeguro(den);
    return Fraccion.crear(n, d);
  }

  sumar(o: Fraccion): Fraccion {
    return Fraccion.crear(this.num * o.den + o.num * this.den, this.den * o.den);
  }

  restar(o: Fraccion): Fraccion {
    return Fraccion.crear(this.num * o.den - o.num * this.den, this.den * o.den);
  }

  multiplicar(o: Fraccion): Fraccion {
    return Fraccion.crear(this.num * o.num, this.den * o.den);
  }

  /** Lanza `ErrorDivisionPorCero` si `o` es cero. */
  dividir(o: Fraccion): Fraccion {
    if (o.num === 0n) {
      throw new ErrorDivisionPorCero();
    }
    return Fraccion.crear(this.num * o.den, this.den * o.num);
  }

  negar(): Fraccion {
    return new Fraccion(-this.num, this.den);
  }

  abs(): Fraccion {
    return this.num < 0n ? new Fraccion(-this.num, this.den) : this;
  }

  /** Compara `this` con `o`: -1 si menor, 0 si igual, 1 si mayor. */
  comparar(o: Fraccion): -1 | 0 | 1 {
    // den y o.den son siempre > 0, así que el signo se preserva al cruzar.
    const izquierda = this.num * o.den;
    const derecha = o.num * this.den;
    if (izquierda < derecha) return -1;
    if (izquierda > derecha) return 1;
    return 0;
  }

  /** Igualdad estructural: como la representación está siempre normalizada, basta comparar num/den. */
  igual(o: Fraccion): boolean {
    return this.num === o.num && this.den === o.den;
  }

  esCero(): boolean {
    return this.num === 0n;
  }

  esPositiva(): boolean {
    return this.num > 0n;
  }

  esNegativa(): boolean {
    return this.num < 0n;
  }

  esEntera(): boolean {
    return this.den === 1n;
  }

  /** `"31/4"`, `"-3"`, `"0"`. */
  aTexto(): string {
    if (this.den === 1n) {
      return this.num.toString();
    }
    return `${this.num.toString()}/${this.den.toString()}`;
  }

  /**
   * Representación decimal con redondeo half-up y sin ceros sobrantes.
   * Ej.: `"7.75"`, `"2.6667"`. No usa `number` en ningún paso del cálculo.
   */
  aDecimal(decimales = 4): string {
    if (this.num === 0n) {
      return "0";
    }
    const signo = this.num < 0n ? "-" : "";
    const numAbs = this.num < 0n ? -this.num : this.num;
    const base = 10n ** BigInt(decimales);

    let parteEntera = numAbs / this.den;
    const resto = numAbs % this.den;

    const escalado = resto * base;
    let parteDecimal = escalado / this.den;
    const restoDecimal = escalado % this.den;

    // Redondeo half-up: si el resto duplicado alcanza o supera el denominador,
    // el dígito descartado era >= 0.5 y se redondea hacia arriba.
    if (restoDecimal * 2n >= this.den) {
      parteDecimal += 1n;
    }

    // El redondeo pudo haber generado un acarreo hacia la parte entera
    // (ej. 0.99996 con 4 decimales → 1.0000).
    if (parteDecimal >= base) {
      parteDecimal -= base;
      parteEntera += 1n;
    }

    const decimalesTexto = quitarCerosSobrantes(parteDecimal.toString().padStart(decimales, "0"));

    if (decimalesTexto === "") {
      return `${signo}${parteEntera.toString()}`;
    }
    return `${signo}${parteEntera.toString()}.${decimalesTexto}`;
  }

  /** Conversión a `number`. SOLO para graficar (capa de presentación), nunca para cálculos del solver. */
  aNumero(): number {
    return Number(this.num) / Number(this.den);
  }
}
