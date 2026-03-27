export function normalizeInstructionSyntax(input: string): string {
  return input
    .trim()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function normalizeToken(input: string): string {
  return input.trim().replace(/\s+/g, " ").toUpperCase();
}
