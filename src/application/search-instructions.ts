import type { InstructionRecord } from "../domain/instruction.js";
import type {
  InstructionRepository,
  InstructionSearchQuery
} from "../domain/instruction-repository.js";
import { normalizeToken } from "./normalize.js";

export interface SearchInput {
  operator?: string;
  registers?: string[];
  flags?: string[];
  cyclesAnyOf?: number[];
  opcode?: string;
  prefix?: string;
  bytes?: number;
  documented?: boolean;
  descriptionContains?: string;
}

export class SearchInstructionsUseCase {
  public constructor(private readonly repository: InstructionRepository) {}

  public async execute(input: SearchInput): Promise<InstructionRecord[]> {
    const query: InstructionSearchQuery = {
      operator: input.operator ? normalizeToken(input.operator) : undefined,
      registers: input.registers?.map(normalizeToken),
      flags: input.flags?.map(normalizeToken),
      cyclesAnyOf: input.cyclesAnyOf,
      opcode: input.opcode ? normalizeToken(input.opcode) : undefined,
      prefix: input.prefix ? normalizeToken(input.prefix) : undefined,
      bytes: input.bytes,
      documented: input.documented,
      descriptionContains: input.descriptionContains?.trim()
    };

    return this.repository.search(query);
  }
}
