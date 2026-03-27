import { describe, expect, it } from "vitest";
import { normalizeInstructionSyntax, normalizeToken } from "../../src/application/normalize.js";

describe("normalize", () => {
  it("normalizes instruction syntax by case and spacing", () => {
    expect(normalizeInstructionSyntax(" ld   a , b ")).toBe("LD A,B");
    expect(normalizeInstructionSyntax("ex   hl, de")).toBe("EX HL,DE");
  });

  it("normalizes token by case and whitespace", () => {
    expect(normalizeToken("  cb  ")).toBe("CB");
    expect(normalizeToken("  p/v ")).toBe("P/V");
  });
});
