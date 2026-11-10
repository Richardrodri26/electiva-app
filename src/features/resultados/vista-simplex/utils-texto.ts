/**
 * Helper de texto puro para la pestaña Simplex (`features/resultados/vista-simplex/utils-texto.ts`).
 *
 * Sin React ni dependencias de UI: solo arma listas en español ("a, b y c"), usado para
 * nombrar restricciones infactibles o variables en los mensajes de estado final
 * (docs/06-ux-ui.md §4).
 */

/** Une una lista en español: `[]` → `""`, `["a"]` → `"a"`, `["a","b","c"]` → `"a, b y c"`. */
export function unirConY(items: readonly string[]): string {
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0]!;
  }
  const todosMenosElUltimo = items.slice(0, -1).join(", ");
  const ultimo = items[items.length - 1]!;
  return `${todosMenosElUltimo} y ${ultimo}`;
}
