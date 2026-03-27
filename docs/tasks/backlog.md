# Backlog

## P0

- Implement robust parser for `https://clrhome.org/table/` with full instruction coverage.
- Introduce persistent database schema and indexed repository implementation.
- Add import pipeline: fetch/parse/normalize/store with idempotent upsert.
- Add integration tests for exact lookup, structured search, opcode lookup.

## P1

- Add richer register/flag impact modeling (`*_affected` style fields or equivalent normalized relation).
- Add pagination and deterministic sorting for `instruction_search`.
- Add parser quality checks (coverage report, duplicate opcode checks, required-field validation).

## P2

- Add snapshot export of parsed dataset for reproducible builds.
- Add benchmark for indexed search.
