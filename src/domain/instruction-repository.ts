import type { InstructionRecord } from "./instruction.js";

export interface InstructionSearchQuery {
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

export interface InstructionRepository {
  findExactBySyntax(normalizedSyntax: string): Promise<InstructionRecord | null>;
  search(query: InstructionSearchQuery): Promise<InstructionRecord[]>;
  findByOpcode(opcodeOrPrefix: string): Promise<InstructionRecord[]>;
  upsertMany(records: InstructionRecord[]): Promise<void>;
}
