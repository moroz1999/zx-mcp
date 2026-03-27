# AGENTS.md

This file contains the most CRITICAL rules that ALL agents must follow.
You MUST read the MD files linked in this document which are relevant to the current task.

## CRITICAL RULES

### General
- Keep it simple, don't invent unnecessary checks.
- Before each new task, read `AGENTS.md` and review the relevant rules if task scope differs from previous.
- All documentation and code comments MUST be in English, even if the user communicates in Russian or another language.
- After completing a task, re-read the task description and verify every point.
- After finishing the task code, it is necessary to read the rules on this topic from the .md docs once again and double-check your changes.
- Before starting a task, you MUST read the relevant documents from the DOCUMENTATION TREE below.
- Documentation updates must be placed in the appropriate .md file.
- Documentation additions in `docs` must be concise, clear, and only about the core points.
- Any new project knowledge must be added to the proper documentation file.
- The agent must create the Markdown documentation tree at project start if it does not exist.
- When the IDE is in 'Ask' (readonly) mode, it is STRICTLY FORBIDDEN to do anything except answering the user's question. No file modifications or tool calls that change state are allowed.
- Do not scan the whole project by file extension. Use targeted paths or direct file reads instead.
- Do not run naive recursive searches over the entire repository. Pick the specific directories from the documented project structure that match the task.

## DOCUMENTATION TREE

Read ONLY the documents relevant to your task.

### Core Documentation
- **`README.md`** - Project entry point and quick start
- **`docs/project-overview.md`** - Project purpose, scope, goals
- **`docs/domain.md`** - Project domain and entities
- **`docs/architecture.md`** - Backend structure and layer responsibilities
- **`docs/data-format.md`** - Parsed instruction data format and field rules
- **`docs/mcp-tools.md`** - MCP tool contracts and behavior

### Task Notes
- **`docs/tasks/`** - Task-specific notes and temporary implementation documentation

## PROJECT STRUCTURE

- `/src/`
    - `/src/domain/` - Domain entities and repository interfaces
    - `/src/application/` - Use cases and application services
    - `/src/infrastructure/` - Parser, normalization, database, repository implementations
    - `/src/interfaces/mcp/` - MCP server integration
- `/docs/` - All documentation
- `/data/` - Parsed or imported source data if needed

## PROJECT RULES

- This project is an MCP server for a structured Z80 instruction reference.
- Source instruction data must be parsed from `https://clrhome.org/table/`.
- All instructions must be included, with an explicit documented / undocumented marker.
- The project must support exact lookup and structured search.
- The project must support normalized input.
- Instruction data must be indexed separately by operator, registers, arguments, cycles, flags, opcode, bytes, and prefix.
- Prefix must be stored both as a separate field and as part of opcode data.
- Database-backed storage is required because the project needs searchable structured records.
- Disassembly support is not part of the initial feature scope, but opcode lookup must be designed with that future use in mind.
- Do not expand the project into an emulator or assembler unless explicitly requested.
- Do not add Docker unless explicitly requested.

## REQUIRED INITIAL DOCUMENTATION TREE

The agent must create this structure at the start of the project if it does not exist:

- `AGENTS.md`
- `README.md`
- `docs/project-overview.md`
- `docs/domain.md`
- `docs/architecture.md`
- `docs/data-format.md`
- `docs/mcp-tools.md`
- `docs/tasks/`