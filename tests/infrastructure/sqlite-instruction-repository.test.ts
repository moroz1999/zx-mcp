import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SqliteInstructionRepository } from "../../src/infrastructure/sqlite-instruction-repository.js";
import { sampleInstructions } from "../../src/infrastructure/sample-data.js";
import type { InstructionRecord } from "../../src/domain/instruction.js";

describe("SqliteInstructionRepository", () => {
  const tempDir = join(tmpdir(), `zx-mcp-tests-${randomUUID()}`);
  const dbPath = join(tempDir, "repo.sqlite");
  let repo: SqliteInstructionRepository;

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });
    repo = new SqliteInstructionRepository(dbPath);
    await repo.upsertMany(sampleInstructions);
  });

  afterAll(async () => {
    repo.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("supports exact lookup with normalization", async () => {
    const found = await repo.findExactBySyntax(" ex  hl,de ");
    expect(found?.syntax).toBe("EX HL,DE");
  });

  it("supports structured search by operator/register/flags/bytes/documented", async () => {
    const rows = await repo.search({
      operator: "bit",
      registers: ["h"],
      flags: ["z", "h"],
      bytes: 2,
      documented: true
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.syntax).toBe("BIT 7,H");
  });

  it("supports search by cycles and description fragment", async () => {
    const rows = await repo.search({
      cyclesAnyOf: [4],
      descriptionContains: "exchange"
    });
    expect(rows.map((x) => x.syntax)).toContain("EX HL,DE");
  });

  it("supports opcode and prefix lookup", async () => {
    const byOpcode = await repo.findByOpcode("78");
    expect(byOpcode.map((x) => x.syntax)).toContain("LD A,B");

    const byPrefix = await repo.findByOpcode("CB");
    expect(byPrefix.map((x) => x.syntax)).toContain("BIT 7,H");
  });

  it("upsert updates existing records", async () => {
    const updated: InstructionRecord = {
      ...sampleInstructions[0],
      description: "Updated description"
    };
    await repo.upsertMany([updated]);
    const found = await repo.findExactBySyntax("EX HL,DE");
    expect(found?.description).toBe("Updated description");
  });
});
