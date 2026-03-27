import type { InstructionRecord } from "../domain/instruction.js";
import type {
  InstructionRepository,
  InstructionSearchQuery
} from "../domain/instruction-repository.js";
import { normalizeInstructionSyntax, normalizeToken } from "../application/normalize.js";

export class InMemoryInstructionRepository implements InstructionRepository {
  private records = new Map<string, InstructionRecord>();

  public constructor(seed: InstructionRecord[] = []) {
    seed.forEach((record) => {
      this.records.set(record.id, record);
    });
  }

  public async findExactBySyntax(normalizedSyntax: string): Promise<InstructionRecord | null> {
    const wanted = normalizeInstructionSyntax(normalizedSyntax);
    for (const record of this.records.values()) {
      if (normalizeInstructionSyntax(record.syntax) === wanted) {
        return record;
      }
    }
    return null;
  }

  public async search(query: InstructionSearchQuery): Promise<InstructionRecord[]> {
    return Array.from(this.records.values()).filter((record) => this.matches(record, query));
  }

  public async findByOpcode(opcodeOrPrefix: string): Promise<InstructionRecord[]> {
    const wanted = normalizeToken(opcodeOrPrefix);
    return Array.from(this.records.values()).filter((record) => {
      const full = normalizeToken(record.opcode.full);
      const prefix = record.opcode.prefix ? normalizeToken(record.opcode.prefix) : "";
      return full === wanted || prefix === wanted || full.includes(wanted);
    });
  }

  public async upsertMany(records: InstructionRecord[]): Promise<void> {
    records.forEach((record) => this.records.set(record.id, record));
  }

  private matches(record: InstructionRecord, query: InstructionSearchQuery): boolean {
    if (query.operator && normalizeToken(record.operator) !== query.operator) {
      return false;
    }
    if (query.registers?.length) {
      const recordRegisters = new Set(record.registers.map(normalizeToken));
      const hasAllRegisters = query.registers.every((register) => recordRegisters.has(register));
      if (!hasAllRegisters) {
        return false;
      }
    }
    if (query.flags?.length) {
      const impactedFlags = new Set(record.flags.map((flagImpact) => normalizeToken(flagImpact.flag)));
      const hasAllFlags = query.flags.every((flag) => impactedFlags.has(flag));
      if (!hasAllFlags) {
        return false;
      }
    }
    if (query.cyclesAnyOf?.length) {
      const hasMatchingCycle = query.cyclesAnyOf.some((cycle) => record.cycles.tStates.includes(cycle));
      if (!hasMatchingCycle) {
        return false;
      }
    }
    if (query.opcode && normalizeToken(record.opcode.full) !== query.opcode) {
      return false;
    }
    if (query.prefix) {
      const prefix = record.opcode.prefix ? normalizeToken(record.opcode.prefix) : "";
      if (prefix !== query.prefix) {
        return false;
      }
    }
    if (typeof query.bytes === "number" && record.opcode.bytes !== query.bytes) {
      return false;
    }
    if (typeof query.documented === "boolean") {
      const isDocumented = record.documentationStatus === "documented";
      if (isDocumented !== query.documented) {
        return false;
      }
    }
    if (query.descriptionContains) {
      const wanted = query.descriptionContains.toLowerCase();
      if (!record.description.toLowerCase().includes(wanted)) {
        return false;
      }
    }
    return true;
  }
}
