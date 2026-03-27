import type { InstructionRecord } from "../domain/instruction.js";
import type { InstructionRepository } from "../domain/instruction-repository.js";
import { normalizeToken } from "./normalize.js";

export class LookupByOpcodeUseCase {
  public constructor(private readonly repository: InstructionRepository) {}

  public async execute(opcodeOrPrefix: string): Promise<InstructionRecord[]> {
    return this.repository.findByOpcode(normalizeToken(opcodeOrPrefix));
  }
}
