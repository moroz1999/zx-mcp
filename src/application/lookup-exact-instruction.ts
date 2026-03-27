import type { InstructionRecord } from "../domain/instruction.js";
import type { InstructionRepository } from "../domain/instruction-repository.js";
import { normalizeInstructionSyntax } from "./normalize.js";

export class LookupExactInstructionUseCase {
  public constructor(private readonly repository: InstructionRepository) {}

  public async execute(rawSyntax: string): Promise<InstructionRecord | null> {
    const normalizedSyntax = normalizeInstructionSyntax(rawSyntax);
    return this.repository.findExactBySyntax(normalizedSyntax);
  }
}
