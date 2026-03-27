# Domain Model

## Core entity

`InstructionRecord` contains:

- `operator`
- `syntax`
- `registers`
- `arguments`
- `cycles`
- `flags`
- `opcode` (including `prefix` and `bytes`)
- `description`
- `documentationStatus` (`documented` or `undocumented`)

## Repository contract

`InstructionRepository` supports:

- exact lookup by syntax (with normalization at application layer)
- structured search by instruction attributes
- opcode/prefix lookup
- batch upsert for parser ingestion
