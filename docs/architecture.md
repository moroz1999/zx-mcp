# Architecture

## Layers

### `src/domain`

Business entities and repository interfaces.

### `src/application`

Use-cases:

- exact instruction lookup
- structured search
- opcode lookup
- shared normalization

### `src/infrastructure`

- SQLite repository implementation (sql.js / SQLite WASM) with relational indexed schema (no JSON payload columns)
- parser service for `clrhome` opcode table HTML
- import command (`import-from-clrhome.ts`) to ingest source data
- seed data for local development fallback

### `src/interfaces/mcp`

MCP server bootstrap and tool handlers mapping to application use-cases.

## Current state

Application use-cases are storage-agnostic and currently run against SQLite.
