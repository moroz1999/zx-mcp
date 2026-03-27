import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SqliteInstructionRepository } from "../../../src/infrastructure/sqlite-instruction-repository.js";
import { sampleInstructions } from "../../../src/infrastructure/sample-data.js";

function parseToolText(result: unknown): unknown {
  const content = (result as { content?: Array<{ type?: string; text?: string }> }).content ?? [];
  const text = content.find((x) => x.type === "text")?.text ?? "null";
  return JSON.parse(text);
}

describe("MCP server e2e", () => {
  const tempDir = join(tmpdir(), `zx-mcp-mcp-e2e-${randomUUID()}`);
  const dbPath = join(tempDir, "server.sqlite");
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });
    const repo = new SqliteInstructionRepository(dbPath);
    await repo.upsertMany(sampleInstructions);
    repo.close();

    client = new Client({ name: "zx-mcp-tests", version: "0.1.0" });
    transport = new StdioClientTransport({
      command: "npm.cmd",
      args: ["run", "dev"],
      cwd: process.cwd(),
      env: {
        ...process.env,
        ZX_MCP_DB_PATH: dbPath,
        NODE_NO_WARNINGS: "1"
      } as Record<string, string>,
      stderr: "pipe"
    });
    await client.connect(transport);
  });

  afterAll(async () => {
    await transport.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    await rm(tempDir, { recursive: true, force: true });
  });

  it("registers expected tools", async () => {
    const listed = await client.listTools();
    const names = listed.tools.map((x) => x.name);
    expect(names).toContain("instruction.lookup_exact");
    expect(names).toContain("instruction.search");
    expect(names).toContain("instruction.lookup_opcode");
  });

  it("supports exact/search/opcode calls", async () => {
    const exact = await client.callTool({
      name: "instruction.lookup_exact",
      arguments: { syntax: " ex  hl, de " }
    });
    const exactPayload = parseToolText(exact) as { syntax: string };
    expect(exactPayload.syntax).toBe("EX HL,DE");

    const search = await client.callTool({
      name: "instruction.search",
      arguments: { operator: "bit", registers: ["h"] }
    });
    const searchPayload = parseToolText(search) as Array<{ syntax: string }>;
    expect(searchPayload.map((x) => x.syntax)).toContain("BIT 7,H");

    const opcode = await client.callTool({
      name: "instruction.lookup_opcode",
      arguments: { opcodeOrPrefix: "cb" }
    });
    const opcodePayload = parseToolText(opcode) as Array<{ syntax: string }>;
    expect(opcodePayload.map((x) => x.syntax)).toContain("BIT 7,H");
  });
});
