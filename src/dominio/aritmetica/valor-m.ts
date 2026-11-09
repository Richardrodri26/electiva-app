/**
 * `ValorM` (`dominio/aritmetica/valor-m.ts`): representa expresiones del
 * método de la Gran M, de la forma `a + b·M`, con `a, b: Fraccion` y `M`
 * simbólico ("infinitamente grande"). Ver docs/03-dominio-y-validacion.md §1.2.
 */

import { Fraccion } from "./fraccion";

export class ValorM {
  readonly a: Fraccion;
  readonly b: Fraccion;

  constructor(a: Fraccion, b: Fraccion = Fraccion.CERO) {
    this.a = a;
    this.b = b;
  }

  sumar(o: ValorM): ValorM {
    return new ValorM(this.a.sumar(o.a), this.b.sumar(o.b));
  }

  restar(o: ValorM): ValorM {
    return new ValorM(this.a.restar(o.a), this.b.restar(o.b));
  }

  multiplicarPor(f: Fraccion): ValorM {
    return new ValorM(this.a.multiplicar(f), this.b.multiplicar(f));
  }

  negar(): ValorM {
    return new ValorM(this.a.negar(), this.b.negar());
  }

  /**
   * Orden: se compara primero el coeficiente de `M` (`b`) y, si empatan, el
   * término constante (`a`).
   */
  comparar(o: ValorM): -1 | 0 | 1 {
    const comparacionB = this.b.comparar(o.b);
    if (comparacionB !== 0) {
      return comparacionB;
    }
    return this.a.comparar(o.a);
  }

  /** `esNegativo() ⇔ b < 0 ∨ (b = 0 ∧ a < 0)`. */
  esNegativo(): boolean {
    return this.b.esNegativa() || (this.b.esCero() && this.a.esNegativa());
  }

  /**
   * Formato: `"3"`, `"M"`, `"-M"`, `"2 - 3M"`, `"-4 + M"`, `"0"`.
   * Se omite el término nulo y el coeficiente `1` de `M` queda implícito.
   */
  aTexto(): string {
    const hayA = !this.a.esCero();
    const hayB = !this.b.esCero();

    if (!hayA && !hayB) {
      return "0";
    }

    if (hayA && !hayB) {
      return this.a.aTexto();
    }

    const bAbs = this.b.abs();
    const terminoM = bAbs.igual(Fraccion.UNO) ? "M" : `${bAbs.aTexto()}M`;

    if (!hayA && hayB) {
      return this.b.esNegativa() ? `-${terminoM}` : terminoM;
    }

    const operador = this.b.esNegativa() ? " - " : " + ";
    return `${this.a.aTexto()}${operador}${terminoM}`;
  }
}
