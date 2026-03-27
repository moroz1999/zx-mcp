import type { InstructionRecord } from "../domain/instruction.js";
import type { FlagEffect, FlagName } from "../domain/instruction.js";
import * as cheerio from "cheerio";

export interface SourceParsingService {
  parseFromClrhomeTable(sourceHtml: string): InstructionRecord[];
}

export class ClrhomeTableParser implements SourceParsingService {
  public parseFromClrhomeTable(sourceHtml: string): InstructionRecord[] {
    const $ = cheerio.load(sourceHtml);
    const records: InstructionRecord[] = [];
    let ordinal = 0;

    $("td").each((_, cell) => {
      const codeNode = $(cell).find("code").first();
      const dlNode = $(cell).find("dl").first();
      if (!codeNode.length || !dlNode.length) {
        return;
      }

      const syntax = this.normalizeWhitespace(codeNode.text()).toUpperCase();
      if (!syntax) {
        return;
      }

      const extracted = this.extractDlEntries($, dlNode);
      const opcode = this.normalizeWhitespace(extracted.get("Opcode") ?? "");
      const bytes = Number.parseInt(this.normalizeWhitespace(extracted.get("Bytes") ?? "0"), 10);
      const cyclesRaw = this.normalizeWhitespace(extracted.get("Cycles") ?? "");
      const description = this.normalizeWhitespace(extracted.get("__description__") ?? "");

      const flags: Array<{ flag: FlagName; effect: FlagEffect }> = (["S", "Z", "H", "P/V", "N", "C"] as FlagName[])
        .map((flagName) => {
          const raw = this.normalizeWhitespace(extracted.get(flagName) ?? "");
          return { flag: flagName, effect: this.mapFlagEffect(raw) };
        });

      const operator = syntax.split(/\s+/)[0] ?? "";
      const argumentsText = syntax.includes(" ") ? syntax.slice(syntax.indexOf(" ") + 1) : "";
      const args = argumentsText ? argumentsText.split(",").map((x) => x.trim()).filter(Boolean) : [];
      const registers = this.extractRegisters(syntax);
      const documentationStatus = $(cell).hasClass("undocumented") ? "undocumented" : "documented";

      ordinal += 1;
      records.push({
        id: `${this.toSlug(syntax)}-${ordinal}`,
        operator,
        syntax,
        registers,
        arguments: args,
        cycles: {
          tStates: this.extractNumericValues(cyclesRaw),
          notes: cyclesRaw || undefined
        },
        flags,
        opcode: {
          full: opcode.toUpperCase(),
          prefix: this.derivePrefix(opcode),
          bytes: Number.isFinite(bytes) ? bytes : 0
        },
        description,
        documentationStatus
      });
    });

    return records;
  }

  private extractDlEntries($: cheerio.CheerioAPI, dlNode: cheerio.Cheerio<any>): Map<string, string> {
    const map = new Map<string, string>();
    let currentKey: string | null = null;
    const descriptionParts: string[] = [];

    dlNode.children().each((_, element) => {
      const tag = element.tagName?.toLowerCase();
      if (tag === "dt") {
        currentKey = this.normalizeWhitespace($(element).text());
        return;
      }
      if (tag === "dd") {
        const value = this.normalizeWhitespace($(element).text());
        if (currentKey) {
          map.set(currentKey, value);
          currentKey = null;
        } else if (value) {
          descriptionParts.push(value);
        }
      }
    });

    map.set("__description__", descriptionParts.join(" ").trim());
    return map;
  }

  private extractNumericValues(text: string): number[] {
    const matches = text.match(/\d+/g) ?? [];
    return matches.map((m) => Number.parseInt(m, 10)).filter((n) => Number.isFinite(n));
  }

  private mapFlagEffect(input: string): FlagEffect {
    const normalized = input.toLowerCase();
    if (normalized.includes("unaffected")) {
      return "unaffected";
    }
    if (normalized.includes("reset")) {
      return "reset";
    }
    if (normalized.includes("set")) {
      return "set";
    }
    if (normalized) {
      return "affected";
    }
    return "unknown";
  }

  private extractRegisters(syntax: string): string[] {
    const registerSet = new Set<string>();
    const knownRegisters = [
      "AF'",
      "AF",
      "BC",
      "DE",
      "HL",
      "IX",
      "IY",
      "SP",
      "PC",
      "A",
      "B",
      "C",
      "D",
      "E",
      "H",
      "L",
      "I",
      "R"
    ];

    knownRegisters.forEach((register) => {
      const escaped = register.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^A-Z'])${escaped}([^A-Z']|$)`, "i");
      if (regex.test(syntax)) {
        registerSet.add(register.toUpperCase());
      }
    });

    return Array.from(registerSet.values());
  }

  private derivePrefix(opcode: string): string | undefined {
    const tokens = this.normalizeWhitespace(opcode)
      .split(" ")
      .map((t) => t.toUpperCase())
      .filter(Boolean);

    if (tokens.length === 0) {
      return undefined;
    }

    const hexToken = /^[0-9A-F]{2}$/;
    const prefixes = ["CB", "DD", "ED", "FD"];

    if (tokens[0] === "DD" && tokens[1] === "CB") {
      return "DD CB";
    }
    if (tokens[0] === "FD" && tokens[1] === "CB") {
      return "FD CB";
    }
    if (prefixes.includes(tokens[0]) && hexToken.test(tokens[0])) {
      return tokens[0];
    }
    return undefined;
  }

  private toSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private normalizeWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
  }
}
