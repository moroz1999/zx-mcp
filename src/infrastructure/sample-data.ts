import type { InstructionRecord } from "../domain/instruction.js";

export const sampleInstructions: InstructionRecord[] = [
  {
    id: "ex-hl-de",
    operator: "EX",
    syntax: "EX HL,DE",
    registers: ["HL", "DE"],
    arguments: ["HL", "DE"],
    cycles: { tStates: [4] },
    flags: [],
    opcode: { full: "EB", bytes: 1 },
    description: "Exchange HL and DE.",
    documentationStatus: "documented"
  },
  {
    id: "ld-a-b",
    operator: "LD",
    syntax: "LD A,B",
    registers: ["A", "B"],
    arguments: ["A", "B"],
    cycles: { tStates: [4] },
    flags: [],
    opcode: { full: "78", bytes: 1 },
    description: "Load register B into A.",
    documentationStatus: "documented"
  },
  {
    id: "bit-7-h",
    operator: "BIT",
    syntax: "BIT 7,H",
    registers: ["H"],
    arguments: ["7", "H"],
    cycles: { tStates: [8] },
    flags: [
      { flag: "Z", effect: "affected" },
      { flag: "H", effect: "set" },
      { flag: "N", effect: "reset" }
    ],
    opcode: { full: "CB 7C", prefix: "CB", bytes: 2 },
    description: "Test bit 7 of H.",
    documentationStatus: "documented"
  }
];
