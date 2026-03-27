import { describe, expect, it } from "vitest";
import { LookupExactInstructionUseCase } from "../../src/application/lookup-exact-instruction.js";
import { LookupByOpcodeUseCase } from "../../src/application/lookup-by-opcode.js";
import { SearchInstructionsUseCase } from "../../src/application/search-instructions.js";
import { InMemoryInstructionRepository } from "../../src/infrastructure/in-memory-instruction-repository.js";
import { sampleInstructions } from "../../src/infrastructure/sample-data.js";

describe("application use-cases", () => {
  const repository = new InMemoryInstructionRepository(sampleInstructions);

  it("finds exact syntax with normalization", async () => {
    const useCase = new LookupExactInstructionUseCase(repository);
    const record = await useCase.execute("  ex  hl, de ");
    expect(record?.syntax).toBe("EX HL,DE");
  });

  it("searches by structured fields", async () => {
    const useCase = new SearchInstructionsUseCase(repository);
    const records = await useCase.execute({ operator: "bit", registers: ["h"], flags: ["z"] });
    expect(records).toHaveLength(1);
    expect(records[0]?.syntax).toBe("BIT 7,H");
  });

  it("looks up by prefix/opcode", async () => {
    const useCase = new LookupByOpcodeUseCase(repository);
    const byPrefix = await useCase.execute("cb");
    expect(byPrefix.map((x) => x.syntax)).toContain("BIT 7,H");
  });
});
