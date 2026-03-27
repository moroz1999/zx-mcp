export type DocumentationStatus = "documented" | "undocumented";

export type FlagName = "S" | "Z" | "H" | "P/V" | "N" | "C";

export type FlagEffect = "set" | "reset" | "affected" | "unaffected" | "unknown";

export interface RegisterEffect {
  register: string;
  affected: boolean;
}

export interface FlagImpact {
  flag: FlagName;
  effect: FlagEffect;
}

export interface CycleInfo {
  tStates: number[];
  notes?: string;
}

export interface OpcodeData {
  full: string;
  prefix?: string;
  bytes: number;
}

export interface InstructionRecord {
  id: string;
  operator: string;
  syntax: string;
  registers: string[];
  arguments: string[];
  cycles: CycleInfo;
  flags: FlagImpact[];
  opcode: OpcodeData;
  description: string;
  documentationStatus: DocumentationStatus;
}
