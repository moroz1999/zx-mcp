# zx-mcp

MCP server with a structured Z80 instruction reference dataset.

## What this server is

`zx-mcp` provides deterministic Z80 instruction data to AI agents.
It supports exact lookup, structured search, and opcode/prefix lookup over a SQLite-backed index.

## Who it is for

- AI agent users who need reliable Z80 instruction answers
- Emulator/disassembler tool authors who need structured lookup data
- Developers building MCP-based workflows around Z80 instruction knowledge

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Import the source dataset from `https://clrhome.org/table/`:

```bash
npm run import:clrhome
```

3. Start the MCP server (stdio transport):

```bash
npm run dev
```

By default, the server uses `data/z80.sqlite`.
Set `ZX_MCP_DB_PATH` to override the database path.

## Connect in VS Code

1. Open the workspace in VS Code.
2. Run `MCP: Open Workspace Folder Configuration` from Command Palette.
3. Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "zxMcp": {
      "type": "stdio",
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/zx-mcp/",
      "env": {
        "ZX_MCP_DB_PATH": "/path/to/zx-mcp/data/z80.sqlite"
      }
    }
  }
}
```

4. Run `MCP: List Servers`, select `zxMcp`, and start/enable it.
5. In Chat/Agent mode, use the server tools:
   - `instruction_lookup_exact`
   - `instruction_search`
   - `instruction_lookup_opcode`
