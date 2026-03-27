# MCP Tools

## `instruction_lookup_exact`

Find exact instruction form by syntax.

Input:

- `syntax: string`

## `instruction_search`

Structured search.

Input fields:

- `operator?: string`
- `registers?: string[]`
- `flags?: string[]`
- `cyclesAnyOf?: number[]`
- `opcode?: string`
- `prefix?: string`
- `bytes?: number`
- `documented?: boolean`
- `descriptionContains?: string`

## `instruction_lookup_opcode`

Find records by full opcode or prefix.

Input:

- `opcodeOrPrefix: string`
