# Project Overview

## What we are building

We are building an MCP server for an AI agent that works as a structured Z80 instruction reference.

The server must provide accurate instruction data from a parsed source and support exact lookup and indexed search.

The source data will be parsed from:

- https://clrhome.org/table/

All instructions must be included.
Documented and undocumented instructions must be stored with an explicit marker.

## Why we are building it

AI agents are unreliable when answering detailed Z80 questions from memory.
This project gives the agent a structured, searchable, deterministic source of truth.

The goal is to let the agent answer questions such as:

- exact lookup for a specific instruction form
- all instructions affecting a specific register
- all instructions affecting a specific flag
- all instructions matching an opcode or prefix
- all arithmetic instructions of a given kind
- all instructions affecting a register pair such as `HL` or `BC`
- lookup by opcode for future disassembly-related tasks

## What we want to get

We want a working MCP server backed by a database.

The server must support:

- exact instruction lookup
- normalized search
- indexed search by structured fields
- opcode-based lookup
- future disassembly-oriented usage

Each instruction record must contain enough structured data to support precise filtering and retrieval.

## Instruction data requirements

Each parsed instruction must contain structured fields derived from the source table.

At minimum, every instruction form must include:

- operator
- syntax
- registers involved
- arguments involved
- cycles
- flags
- opcode
- byte length
- textual description
- documented / undocumented marker
- prefix as a separate field
- prefix also represented as part of opcode data

The data must support queries like:

- exact search for `EX HL,DE`
- all instructions affecting `HL`
- all `SUB` instructions
- all `SBC` instructions
- all `ADD` instructions affecting `BC`
- all instructions matching a given opcode

## Structured indexing requirements

The data model must support indexing of instruction properties separately.

Examples:

- operator: `EX`
- registers: `HL`, `DE`
- argument types
- cycles
- flags
- opcode
- bytes
- prefix
- description

Register and flag influence must be queryable in a structured way.

Example idea:

- `HL affected = true`
- `DE affected = true`
- `S affected = true/false`
- `Z affected = true/false`
- `H affected = true/false`
- `P/V affected = true/false`
- `N affected = true/false`
- `C affected = true/false`

The model must support full detail, not a simplified approximation.

## Scope

## In scope

- MCP server
- parser for the source instruction table
- structured Z80 instruction dataset
- exact lookup
- normalized search
- indexed search by operator, registers, arguments, flags, cycles, opcode, bytes
- documented / undocumented instruction marker
- opcode lookup for future disassembly use
- Markdown documentation tree

## Out of scope for now

- emulator
- assembler
- full disassembler implementation
- web UI
- Docker setup

Disassembly-related lookup must be considered in the design, but a full disassembler is not part of the initial scope.

## Services

The backend must provide the following functional services.

### 1. Source parsing service

Purpose:
Parse instruction data from the source table and convert it into structured records.

Responsibilities:

- fetch or load source data
- parse instruction rows
- normalize extracted values
- mark documented / undocumented instructions
- store parsed results in the database

### 2. Instruction lookup service

Purpose:
Return one exact instruction form.

Examples:

- `EX HL,DE`
- `LD A,B`
- `BIT 7,H`

Responsibilities:

- normalize input
- perform exact lookup
- return full structured instruction data

### 3. Instruction search service

Purpose:
Return instruction forms matching structured filters.

Search dimensions:

- operator
- registers
- arguments
- cycles
- flags
- opcode
- prefix
- byte length
- documented / undocumented marker
- textual description if needed

### 4. Opcode lookup service

Purpose:
Support lookup by opcode for disassembly-oriented use cases.

Responsibilities:

- search by full opcode
- search by prefix
- return matching instruction forms

## Backend structure

The backend should use a simple layered structure.

### `src/domain/`

Contains:

- instruction entities
- opcode model
- prefix model
- register and argument models
- cycle model
- flag model
- repository interfaces

### `src/application/`

Contains:

- exact instruction lookup use cases
- structured search use cases
- opcode lookup use cases

### `src/infrastructure/`

Contains:

- parser implementation for the source table
- normalization logic
- database access
- repository implementations

### `src/interfaces/mcp/`

Contains:

- MCP server bootstrap
- MCP tool registration
- mapping between MCP requests and application use cases

## Storage

Data will be stored in a database because the project requires structured indexed search.

The implementation must be designed around searchable structured records, not flat text blobs.

## Stack

Recommended stack:

- TypeScript
- Node.js
- database-backed storage
- MCP-compatible server implementation

The parser must ingest data from:

- https://clrhome.org/table/

## MCP capabilities to support

The initial MCP server must support:

- exact instruction lookup
- search by operator
- search by registers
- search by flags
- search by cycles
- search by instruction type
- search by opcode
- normalized input handling

## Normalization

Normalization is required.

Search must not depend on exact input casing or spacing.
Equivalent inputs must resolve correctly when the meaning is the same.

Examples:

- `ld a,b`
- `LD A, B`
- ` ld   a , b `

These must normalize to the same logical query.

## Documentation tree requirement

The agent must create the Markdown documentation tree at project start and keep it updated as project knowledge becomes clearer.

Required initial documentation tree:

- `AGENTS.md`
- `README.md`
- `docs/project-overview.md`
- `docs/domain.md`
- `docs/architecture.md`
- `docs/data-format.md`
- `docs/mcp-tools.md`
- `docs/tasks/`

The agent must place new knowledge into the correct file instead of scattering notes across random documents.