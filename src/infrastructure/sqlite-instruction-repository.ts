import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs, { type Database, type SqlValue } from "sql.js";
import type { InstructionRecord } from "../domain/instruction.js";
import type {
  InstructionRepository,
  InstructionSearchQuery
} from "../domain/instruction-repository.js";
import { normalizeInstructionSyntax, normalizeToken } from "../application/normalize.js";

const sqlJsDistDir = fileURLToPath(new URL("../../node_modules/sql.js/dist/", import.meta.url));

export class SqliteInstructionRepository implements InstructionRepository {
  private readonly filePath: string;
  private db: Database | null = null;
  private readonly ready: Promise<void>;

  public constructor(filePath = "data/z80.sqlite") {
    this.filePath = filePath;
    this.ready = this.initialize();
  }

  public async findExactBySyntax(normalizedSyntax: string): Promise<InstructionRecord | null> {
    await this.ready;
    const row = this.queryOne<InstructionCoreRow>(
      `
      SELECT
        id,
        operator,
        syntax,
        opcode_full,
        opcode_prefix,
        opcode_bytes,
        description,
        documentation_status,
        cycles_notes
      FROM instructions
      WHERE syntax = ?
      LIMIT 1
      `,
      [normalizeInstructionSyntax(normalizedSyntax)]
    );
    if (!row) {
      return null;
    }
    const [record] = this.hydrateRecords([row]);
    return record ?? null;
  }

  public async search(query: InstructionSearchQuery): Promise<InstructionRecord[]> {
    await this.ready;
    let sql = `
      SELECT
        i.id,
        i.operator,
        i.syntax,
        i.opcode_full,
        i.opcode_prefix,
        i.opcode_bytes,
        i.description,
        i.documentation_status,
        i.cycles_notes
      FROM instructions i
    `;
    const where: string[] = [];
    const params: SqlValue[] = [];

    if (query.registers?.length) {
      for (const register of query.registers) {
        where.push(`
          EXISTS (
            SELECT 1
            FROM instruction_registers ir
            WHERE ir.instruction_id = i.id
              AND ir.register = ?
          )
        `);
        params.push(normalizeToken(register));
      }
    }

    if (query.flags?.length) {
      for (const flag of query.flags) {
        where.push(`
          EXISTS (
            SELECT 1
            FROM instruction_flags ifl
            WHERE ifl.instruction_id = i.id
              AND ifl.flag = ?
          )
        `);
        params.push(normalizeToken(flag));
      }
    }

    if (query.cyclesAnyOf?.length) {
      const placeholders = query.cyclesAnyOf.map(() => "?").join(",");
      where.push(`
        EXISTS (
          SELECT 1
          FROM instruction_cycles ic
          WHERE ic.instruction_id = i.id
            AND ic.t_state IN (${placeholders})
        )
      `);
      params.push(...query.cyclesAnyOf);
    }

    if (query.operator) {
      where.push("i.operator = ?");
      params.push(normalizeToken(query.operator));
    }
    if (query.opcode) {
      where.push("i.opcode_full = ?");
      params.push(normalizeToken(query.opcode));
    }
    if (query.prefix) {
      where.push("i.opcode_prefix = ?");
      params.push(normalizeToken(query.prefix));
    }
    if (typeof query.bytes === "number") {
      where.push("i.opcode_bytes = ?");
      params.push(query.bytes);
    }
    if (typeof query.documented === "boolean") {
      where.push("i.documentation_status = ?");
      params.push(query.documented ? "documented" : "undocumented");
    }
    if (query.descriptionContains) {
      where.push("lower(i.description) LIKE ?");
      params.push(`%${query.descriptionContains.toLowerCase()}%`);
    }

    if (where.length) {
      sql += ` WHERE ${where.join(" AND ")}`;
    }
    sql += " ORDER BY i.syntax ASC";

    const rows = this.queryAll<InstructionCoreRow>(sql, params);
    return this.hydrateRecords(rows);
  }

  public async findByOpcode(opcodeOrPrefix: string): Promise<InstructionRecord[]> {
    await this.ready;
    const wanted = normalizeToken(opcodeOrPrefix);
    const rows = this.queryAll<InstructionCoreRow>(
      `
      SELECT
        id,
        operator,
        syntax,
        opcode_full,
        opcode_prefix,
        opcode_bytes,
        description,
        documentation_status,
        cycles_notes
      FROM instructions
      WHERE opcode_full = ?
         OR opcode_prefix = ?
         OR opcode_full LIKE ?
      ORDER BY syntax ASC
      `,
      [wanted, wanted, `%${wanted}%`]
    );
    return this.hydrateRecords(rows);
  }

  public async upsertMany(records: InstructionRecord[]): Promise<void> {
    await this.ready;
    const db = this.getDb();
    db.exec("BEGIN");
    try {
      for (const record of records) {
        this.run(
          `
          INSERT INTO instructions (
            id, operator, syntax, opcode_full, opcode_prefix, opcode_bytes, description, documentation_status, cycles_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            operator = excluded.operator,
            syntax = excluded.syntax,
            opcode_full = excluded.opcode_full,
            opcode_prefix = excluded.opcode_prefix,
            opcode_bytes = excluded.opcode_bytes,
            description = excluded.description,
            documentation_status = excluded.documentation_status,
            cycles_notes = excluded.cycles_notes
          `,
          [
            record.id,
            normalizeToken(record.operator),
            normalizeInstructionSyntax(record.syntax),
            normalizeToken(record.opcode.full),
            record.opcode.prefix ? normalizeToken(record.opcode.prefix) : null,
            record.opcode.bytes,
            record.description,
            record.documentationStatus,
            record.cycles.notes?.trim() || null
          ]
        );

        this.run("DELETE FROM instruction_registers WHERE instruction_id = ?", [record.id]);
        for (const register of record.registers) {
          this.run("INSERT INTO instruction_registers (instruction_id, register) VALUES (?, ?)", [
            record.id,
            normalizeToken(register)
          ]);
        }

        this.run("DELETE FROM instruction_arguments WHERE instruction_id = ?", [record.id]);
        for (const [index, argument] of record.arguments.entries()) {
          this.run(
            `
            INSERT INTO instruction_arguments (instruction_id, argument_index, argument)
            VALUES (?, ?, ?)
            `,
            [record.id, index, normalizeToken(argument)]
          );
        }

        this.run("DELETE FROM instruction_cycles WHERE instruction_id = ?", [record.id]);
        for (const [index, cycle] of record.cycles.tStates.entries()) {
          this.run(
            `
            INSERT INTO instruction_cycles (instruction_id, cycle_order, t_state)
            VALUES (?, ?, ?)
            `,
            [record.id, index, cycle]
          );
        }

        this.run("DELETE FROM instruction_flags WHERE instruction_id = ?", [record.id]);
        for (const flag of record.flags) {
          this.run("INSERT INTO instruction_flags (instruction_id, flag, effect) VALUES (?, ?, ?)", [
            record.id,
            normalizeToken(flag.flag),
            flag.effect
          ]);
        }
      }

      db.exec("COMMIT");
      await this.persist();
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  public close(): void {
    void this.ready.then(async () => {
      await this.persist();
      this.getDb().close();
      this.db = null;
    });
  }

  private async initialize(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => join(sqlJsDistDir, file)
    });
    const db = await this.loadDatabase(SQL);
    this.db = db;
    this.ensureSchema();
    await this.persist();
  }

  private async loadDatabase(SQL: Awaited<ReturnType<typeof initSqlJs>>): Promise<Database> {
    try {
      const existing = await readFile(this.filePath);
      return new SQL.Database(existing);
    } catch {
      return new SQL.Database();
    }
  }

  private async persist(): Promise<void> {
    if (!this.db) {
      return;
    }
    await mkdir(dirname(this.filePath), { recursive: true });
    const bytes = this.db.export();
    await writeFile(this.filePath, Buffer.from(bytes));
  }

  private ensureSchema(): void {
    this.exec("PRAGMA foreign_keys = ON;");
    const columns = this.getInstructionColumnNames();
    if (columns && this.isLegacyInstructionSchema(columns)) {
      this.migrateFromLegacyJsonSchema();
    }

    this.exec(`
      CREATE TABLE IF NOT EXISTS instructions (
        id TEXT PRIMARY KEY,
        operator TEXT NOT NULL,
        syntax TEXT NOT NULL,
        opcode_full TEXT NOT NULL,
        opcode_prefix TEXT,
        opcode_bytes INTEGER NOT NULL,
        description TEXT NOT NULL,
        documentation_status TEXT NOT NULL CHECK (documentation_status IN ('documented', 'undocumented')),
        cycles_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS instruction_registers (
        instruction_id TEXT NOT NULL,
        register TEXT NOT NULL,
        FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS instruction_arguments (
        instruction_id TEXT NOT NULL,
        argument_index INTEGER NOT NULL,
        argument TEXT NOT NULL,
        FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS instruction_cycles (
        instruction_id TEXT NOT NULL,
        cycle_order INTEGER NOT NULL,
        t_state INTEGER NOT NULL,
        FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS instruction_flags (
        instruction_id TEXT NOT NULL,
        flag TEXT NOT NULL,
        effect TEXT NOT NULL,
        FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_instruction_operator ON instructions (operator);
      CREATE INDEX IF NOT EXISTS idx_instruction_syntax ON instructions (syntax);
      CREATE INDEX IF NOT EXISTS idx_instruction_opcode_full ON instructions (opcode_full);
      CREATE INDEX IF NOT EXISTS idx_instruction_opcode_prefix ON instructions (opcode_prefix);
      CREATE INDEX IF NOT EXISTS idx_instruction_opcode_bytes ON instructions (opcode_bytes);
      CREATE INDEX IF NOT EXISTS idx_instruction_documentation_status ON instructions (documentation_status);
      CREATE INDEX IF NOT EXISTS idx_instruction_registers_register ON instruction_registers (register);
      CREATE INDEX IF NOT EXISTS idx_instruction_arguments_argument ON instruction_arguments (argument);
      CREATE INDEX IF NOT EXISTS idx_instruction_cycles_t_state ON instruction_cycles (t_state);
      CREATE INDEX IF NOT EXISTS idx_instruction_flags_flag ON instruction_flags (flag);
    `);

    const refreshedColumns = this.getInstructionColumnNames();
    if (refreshedColumns && !refreshedColumns.has("cycles_notes")) {
      this.exec("ALTER TABLE instructions ADD COLUMN cycles_notes TEXT");
    }
  }

  private hydrateRecords(coreRows: InstructionCoreRow[]): InstructionRecord[] {
    if (coreRows.length === 0) {
      return [];
    }

    const ids = coreRows.map((row) => row.id);
    const registers = this.selectByIds<RelationRegisterRow>(
      `
        SELECT instruction_id, register
        FROM instruction_registers
        WHERE instruction_id IN (${this.createPlaceholders(ids.length)})
        ORDER BY instruction_id, register
      `,
      ids
    );
    const argumentsRows = this.selectByIds<RelationArgumentRow>(
      `
        SELECT instruction_id, argument_index, argument
        FROM instruction_arguments
        WHERE instruction_id IN (${this.createPlaceholders(ids.length)})
        ORDER BY instruction_id, argument_index
      `,
      ids
    );
    const cycleRows = this.selectByIds<RelationCycleRow>(
      `
        SELECT instruction_id, cycle_order, t_state
        FROM instruction_cycles
        WHERE instruction_id IN (${this.createPlaceholders(ids.length)})
        ORDER BY instruction_id, cycle_order
      `,
      ids
    );
    const flagRows = this.selectByIds<RelationFlagRow>(
      `
        SELECT instruction_id, flag, effect
        FROM instruction_flags
        WHERE instruction_id IN (${this.createPlaceholders(ids.length)})
        ORDER BY instruction_id, flag
      `,
      ids
    );

    const registersById = new Map<string, string[]>();
    const argumentsById = new Map<string, string[]>();
    const cyclesById = new Map<string, number[]>();
    const flagsById = new Map<
      string,
      Array<{ flag: InstructionRecord["flags"][number]["flag"]; effect: InstructionRecord["flags"][number]["effect"] }>
    >();

    for (const row of registers) {
      const bucket = registersById.get(row.instruction_id) ?? [];
      bucket.push(row.register);
      registersById.set(row.instruction_id, bucket);
    }

    for (const row of argumentsRows) {
      const bucket = argumentsById.get(row.instruction_id) ?? [];
      bucket.push(row.argument);
      argumentsById.set(row.instruction_id, bucket);
    }

    for (const row of cycleRows) {
      const bucket = cyclesById.get(row.instruction_id) ?? [];
      bucket.push(row.t_state);
      cyclesById.set(row.instruction_id, bucket);
    }

    for (const row of flagRows) {
      const bucket = flagsById.get(row.instruction_id) ?? [];
      bucket.push({
        flag: row.flag as InstructionRecord["flags"][number]["flag"],
        effect: row.effect as InstructionRecord["flags"][number]["effect"]
      });
      flagsById.set(row.instruction_id, bucket);
    }

    return coreRows.map((row) => ({
      id: row.id,
      operator: row.operator,
      syntax: row.syntax,
      registers: registersById.get(row.id) ?? [],
      arguments: argumentsById.get(row.id) ?? [],
      cycles: {
        tStates: cyclesById.get(row.id) ?? [],
        notes: row.cycles_notes ?? undefined
      },
      flags: flagsById.get(row.id) ?? [],
      opcode: {
        full: row.opcode_full,
        prefix: row.opcode_prefix ?? undefined,
        bytes: row.opcode_bytes
      },
      description: row.description,
      documentationStatus: row.documentation_status
    }));
  }

  private selectByIds<T>(sql: string, ids: string[]): T[] {
    if (ids.length === 0) {
      return [];
    }
    return this.queryAll<T>(sql, ids);
  }

  private createPlaceholders(count: number): string {
    return Array.from({ length: count }, () => "?").join(",");
  }

  private getInstructionColumnNames(): Set<string> | null {
    const table = this.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'instructions' LIMIT 1"
    );
    if (!table) {
      return null;
    }
    const rows = this.queryAll<Array<{ name: string }>[number]>("PRAGMA table_info(instructions)");
    return new Set(rows.map((row) => row.name));
  }

  private isLegacyInstructionSchema(columns: Set<string>): boolean {
    return (
      columns.has("normalized_syntax") ||
      columns.has("registers_json") ||
      columns.has("arguments_json") ||
      columns.has("cycles_json") ||
      columns.has("flags_json")
    );
  }

  private migrateFromLegacyJsonSchema(): void {
    const legacyRows = this.queryAll<LegacyInstructionRow>(
      `
      SELECT
        id,
        operator,
        syntax,
        registers_json,
        arguments_json,
        cycles_json,
        flags_json,
        opcode_full,
        opcode_prefix,
        opcode_bytes,
        description,
        documentation_status
      FROM instructions
      ORDER BY syntax ASC
      `
    );

    this.exec("PRAGMA foreign_keys = OFF;");
    this.exec("BEGIN");
    try {
      this.exec(`
        DROP TABLE IF EXISTS instruction_registers;
        DROP TABLE IF EXISTS instruction_arguments;
        DROP TABLE IF EXISTS instruction_cycles;
        DROP TABLE IF EXISTS instruction_flags;

        CREATE TABLE instruction_registers (
          instruction_id TEXT NOT NULL,
          register TEXT NOT NULL,
          FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
        );

        CREATE TABLE instruction_arguments (
          instruction_id TEXT NOT NULL,
          argument_index INTEGER NOT NULL,
          argument TEXT NOT NULL,
          FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
        );

        CREATE TABLE instruction_cycles (
          instruction_id TEXT NOT NULL,
          cycle_order INTEGER NOT NULL,
          t_state INTEGER NOT NULL,
          FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
        );

        CREATE TABLE instruction_flags (
          instruction_id TEXT NOT NULL,
          flag TEXT NOT NULL,
          effect TEXT NOT NULL,
          FOREIGN KEY (instruction_id) REFERENCES instructions (id) ON DELETE CASCADE
        );

        CREATE TABLE instructions_new (
          id TEXT PRIMARY KEY,
          operator TEXT NOT NULL,
          syntax TEXT NOT NULL,
          opcode_full TEXT NOT NULL,
          opcode_prefix TEXT,
          opcode_bytes INTEGER NOT NULL,
          description TEXT NOT NULL,
          documentation_status TEXT NOT NULL CHECK (documentation_status IN ('documented', 'undocumented')),
          cycles_notes TEXT
        );
      `);

      for (const row of legacyRows) {
        const cycles = this.parseLegacyCycles(row.cycles_json);
        this.run(
          `
          INSERT INTO instructions_new (
            id, operator, syntax, opcode_full, opcode_prefix, opcode_bytes, description, documentation_status, cycles_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            row.id,
            normalizeToken(row.operator),
            normalizeInstructionSyntax(row.syntax),
            normalizeToken(row.opcode_full),
            row.opcode_prefix ? normalizeToken(row.opcode_prefix) : null,
            row.opcode_bytes,
            row.description,
            row.documentation_status,
            cycles.notes?.trim() || null
          ]
        );

        for (const register of this.parseLegacyStringArray(row.registers_json)) {
          this.run("INSERT INTO instruction_registers (instruction_id, register) VALUES (?, ?)", [
            row.id,
            normalizeToken(register)
          ]);
        }

        for (const [index, argument] of this.parseLegacyStringArray(row.arguments_json).entries()) {
          this.run(
            `
            INSERT INTO instruction_arguments (instruction_id, argument_index, argument)
            VALUES (?, ?, ?)
            `,
            [row.id, index, normalizeToken(argument)]
          );
        }

        for (const [index, cycle] of cycles.tStates.entries()) {
          this.run(
            `
            INSERT INTO instruction_cycles (instruction_id, cycle_order, t_state)
            VALUES (?, ?, ?)
            `,
            [row.id, index, cycle]
          );
        }

        for (const flag of this.parseLegacyFlagRows(row.flags_json)) {
          this.run("INSERT INTO instruction_flags (instruction_id, flag, effect) VALUES (?, ?, ?)", [
            row.id,
            normalizeToken(flag.flag),
            flag.effect
          ]);
        }
      }

      this.exec(`
        DROP TABLE instructions;
        ALTER TABLE instructions_new RENAME TO instructions;
      `);
      this.exec("COMMIT");
    } catch (error) {
      this.exec("ROLLBACK");
      throw error;
    } finally {
      this.exec("PRAGMA foreign_keys = ON;");
    }
  }

  private parseLegacyStringArray(raw: unknown): string[] {
    const parsed = this.tryParseJson(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  }

  private parseLegacyCycles(raw: unknown): { tStates: number[]; notes?: string } {
    const parsed = this.tryParseJson(raw);
    if (!parsed || typeof parsed !== "object") {
      return { tStates: [] };
    }
    const tStatesRaw = (parsed as { tStates?: unknown }).tStates;
    const notesRaw = (parsed as { notes?: unknown }).notes;
    const tStates = Array.isArray(tStatesRaw)
      ? tStatesRaw.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      : [];
    const notes = typeof notesRaw === "string" ? notesRaw : undefined;
    return { tStates, notes };
  }

  private parseLegacyFlagRows(raw: unknown): Array<{ flag: string; effect: string }> {
    const parsed = this.tryParseJson(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((value) => {
        if (!value || typeof value !== "object") {
          return null;
        }
        const flag = (value as { flag?: unknown }).flag;
        const effect = (value as { effect?: unknown }).effect;
        if (typeof flag !== "string" || typeof effect !== "string") {
          return null;
        }
        return { flag, effect };
      })
      .filter((value): value is { flag: string; effect: string } => Boolean(value));
  }

  private tryParseJson(raw: unknown): unknown {
    if (typeof raw !== "string") {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private exec(sql: string): void {
    this.getDb().exec(sql);
  }

  private run(sql: string, params: SqlValue[] = []): void {
    const stmt = this.getDb().prepare(sql);
    try {
      stmt.run(params);
    } finally {
      stmt.free();
    }
  }

  private queryOne<T>(sql: string, params: SqlValue[] = []): T | null {
    const rows = this.queryAll<T>(sql, params);
    return rows[0] ?? null;
  }

  private queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
    const stmt = this.getDb().prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  private getDb(): Database {
    if (!this.db) {
      throw new Error("SQLite database is not initialized.");
    }
    return this.db;
  }
}

interface InstructionCoreRow {
  id: string;
  operator: string;
  syntax: string;
  opcode_full: string;
  opcode_prefix: string | null;
  opcode_bytes: number;
  description: string;
  documentation_status: "documented" | "undocumented";
  cycles_notes: string | null;
}

interface RelationRegisterRow {
  instruction_id: string;
  register: string;
}

interface RelationArgumentRow {
  instruction_id: string;
  argument_index: number;
  argument: string;
}

interface RelationCycleRow {
  instruction_id: string;
  cycle_order: number;
  t_state: number;
}

interface RelationFlagRow {
  instruction_id: string;
  flag: string;
  effect: string;
}

interface LegacyInstructionRow {
  id: string;
  operator: string;
  syntax: string;
  registers_json: unknown;
  arguments_json: unknown;
  cycles_json: unknown;
  flags_json: unknown;
  opcode_full: string;
  opcode_prefix: string | null;
  opcode_bytes: number;
  description: string;
  documentation_status: "documented" | "undocumented";
}
