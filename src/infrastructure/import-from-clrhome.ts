import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { ClrhomeTableParser } from "./source-parser.js";
import { SqliteInstructionRepository } from "./sqlite-instruction-repository.js";

const SOURCE_URL = "https://clrhome.org/table/";
const dbPath = process.env.ZX_MCP_DB_PATH ?? "data/z80.sqlite";

async function run(): Promise<void> {
  await mkdir(dirname(dbPath), { recursive: true });
  const html = await fetchHtml(SOURCE_URL);
  const parser = new ClrhomeTableParser();
  const records = parser.parseFromClrhomeTable(html);
  const repository = new SqliteInstructionRepository(dbPath);
  await repository.upsertMany(records);
  process.stdout.write(`Imported ${records.length} instructions into ${dbPath}\n`);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
