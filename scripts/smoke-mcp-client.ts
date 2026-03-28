import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

function extractText(result: unknown): string {
  const content = (result as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!content?.length) {
    return "";
  }
  return content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text ?? "")
    .join("\n");
}

async function run(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["--import", "tsx", "src/interfaces/mcp/server.ts"],
    cwd: process.cwd(),
    stderr: "pipe"
  });

  if (transport.stderr) {
    transport.stderr.on("data", (chunk) => {
      process.stderr.write(`[server] ${String(chunk)}`);
    });
  }

  const client = new Client({
    name: "zx-mcp-smoke-client",
    version: "0.1.0"
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    console.log("Tools:", tools.tools.map((tool) => tool.name).join(", "));

    const exact = await client.callTool({
      name: "instruction_lookup_exact",
      arguments: { syntax: "EX DE,HL" }
    });
    console.log("\nlookup_exact(EX DE,HL):");
    console.log(extractText(exact));

    const search = await client.callTool({
      name: "instruction_search",
      arguments: { operator: "BIT", registers: ["H"] }
    });
    const searchText = extractText(search);
    const searchItems = JSON.parse(searchText) as unknown[];
    console.log(`\nsearch(operator=BIT, registers=[H]) -> ${searchItems.length} rows`);

    const opcode = await client.callTool({
      name: "instruction_lookup_opcode",
      arguments: { opcodeOrPrefix: "CB" }
    });
    const opcodeText = extractText(opcode);
    const opcodeItems = JSON.parse(opcodeText) as unknown[];
    console.log(`lookup_opcode(CB) -> ${opcodeItems.length} rows`);
  } finally {
    await transport.close();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
