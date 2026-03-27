import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { LookupExactInstructionUseCase } from "../../application/lookup-exact-instruction.js";
import { LookupByOpcodeUseCase } from "../../application/lookup-by-opcode.js";
import { SearchInstructionsUseCase } from "../../application/search-instructions.js";
import { sampleInstructions } from "../../infrastructure/sample-data.js";
import { SqliteInstructionRepository } from "../../infrastructure/sqlite-instruction-repository.js";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const dbPath = process.env.ZX_MCP_DB_PATH ?? "data/z80.sqlite";
await mkdir(dirname(dbPath), { recursive: true });
const repository = new SqliteInstructionRepository(dbPath);
if ((await repository.search({})).length === 0) {
  await repository.upsertMany(sampleInstructions);
}
const lookupExact = new LookupExactInstructionUseCase(repository);
const lookupByOpcode = new LookupByOpcodeUseCase(repository);
const searchInstructions = new SearchInstructionsUseCase(repository);

const server = new Server(
  {
    name: "zx-mcp",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const exactInputSchema = z.object({
  syntax: z.string().min(1)
});

const opcodeInputSchema = z.object({
  opcodeOrPrefix: z.string().min(1)
});

const searchInputSchema = z.object({
  operator: z.string().optional(),
  registers: z.array(z.string()).optional(),
  flags: z.array(z.string()).optional(),
  cyclesAnyOf: z.array(z.number().int()).optional(),
  opcode: z.string().optional(),
  prefix: z.string().optional(),
  bytes: z.number().int().optional(),
  documented: z.boolean().optional(),
  descriptionContains: z.string().optional()
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "instruction_lookup_exact",
      description: "Find one exact Z80 instruction by syntax form (e.g., EX HL,DE).",
      inputSchema: {
        type: "object",
        properties: {
          syntax: { type: "string" }
        },
        required: ["syntax"]
      }
    },
    {
      name: "instruction_search",
      description: "Structured instruction search by operator/registers/flags/cycles/opcode/prefix/bytes.",
      inputSchema: {
        type: "object",
        properties: {
          operator: { type: "string" },
          registers: { type: "array", items: { type: "string" } },
          flags: { type: "array", items: { type: "string" } },
          cyclesAnyOf: { type: "array", items: { type: "number" } },
          opcode: { type: "string" },
          prefix: { type: "string" },
          bytes: { type: "number" },
          documented: { type: "boolean" },
          descriptionContains: { type: "string" }
        }
      }
    },
    {
      name: "instruction_lookup_opcode",
      description: "Find instructions by full opcode or prefix.",
      inputSchema: {
        type: "object",
        properties: {
          opcodeOrPrefix: { type: "string" }
        },
        required: ["opcodeOrPrefix"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "instruction_lookup_exact") {
    const input = exactInputSchema.parse(args);
    const result = await lookupExact.execute(input.syntax);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === "instruction_search") {
    const input = searchInputSchema.parse(args);
    const result = await searchInstructions.execute(input);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  if (name === "instruction_lookup_opcode") {
    const input = opcodeInputSchema.parse(args);
    const result = await lookupByOpcode.execute(input.opcodeOrPrefix);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
