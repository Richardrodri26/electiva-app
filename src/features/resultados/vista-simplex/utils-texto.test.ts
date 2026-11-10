import { describe, expect, it } from "vitest";

import { unirConY } from "./utils-texto";

describe("unirConY", () => {
  it("devuelve una cadena vacía para una lista vacía", () => {
    expect(unirConY([])).toBe("");
  });

  it("devuelve el único elemento sin conectores", () => {
    expect(unirConY(["R1"])).toBe("R1");
  });

  it("une dos elementos con 'y'", () => {
    expect(unirConY(["R1", "R2"])).toBe("R1 y R2");
  });

  it("une tres o más elementos con comas y 'y' antes del último", () => {
    expect(unirConY(["R1", "R2", "R3"])).toBe("R1, R2 y R3");
  });
});
