# Data Format

Instruction records are stored as structured objects.

## Required fields

- `operator: string`
- `syntax: string`
- `registers: string[]`
- `arguments: string[]`
- `cycles: { tStates: number[]; notes?: string }`
- `flags: { flag: "S" | "Z" | "H" | "P/V" | "N" | "C"; effect: "set" | "reset" | "affected" | "unaffected" | "unknown" }[]`
- `opcode: { full: string; prefix?: string; bytes: number }`
- `description: string`
- `documentationStatus: "documented" | "undocumented"`

## Normalization

- instruction syntax: trim, collapse spaces, normalize comma spacing, uppercase
- tokens (operator/registers/opcode/prefix): uppercase + trimmed

## Storage notes

SQLite schema contains:

- `instructions` main table with scalar fields (`operator`, `syntax`, `opcode_*`, `description`, `documentation_status`, `cycles_notes`)
- `instruction_registers` relation for register indexing
- `instruction_arguments` relation for argument indexing
- `instruction_cycles` relation for cycle indexing
- `instruction_flags` relation for flag indexing

Primary indexes:

- `syntax`
- `operator`
- `opcode_full`
- `opcode_prefix`
- `opcode_bytes`
- `documentation_status`
- relation indexes for register, argument, cycle, and flag lookups
