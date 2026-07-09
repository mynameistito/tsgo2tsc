/** Token-safe tsgo -> tsc replacements in command strings */
const TSGo_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(^|[;&|({}\s/])bunx\s+tsgo(?=$|[\s;&|)])/gu, replacement: "$1bunx tsc" },
  { pattern: /(^|[;&|({}\s/])npx\s+tsgo(?=$|[\s;&|)])/gu, replacement: "$1npx tsc" },
  { pattern: /(^|[;&|({}\s/])pnpm\s+tsgo(?=$|[\s;&|)])/gu, replacement: "$1pnpm tsc" },
  { pattern: /(^|[;&|({}\s/])yarn\s+tsgo(?=$|[\s;&|)])/gu, replacement: "$1yarn tsc" },
  { pattern: /(^|[;&|({}\s/])tsgo\s+--build\b/gu, replacement: "$1tsc --build" },
  { pattern: /(^|[;&|({}\s/])tsgo\s+-b\b/gu, replacement: "$1tsc -b" },
  { pattern: /(^|[;&|({}\s/])tsgo(?=$|[\s;&|)])/gu, replacement: "$1tsc" },
];

export function replaceTsgoInCommand(command: string): string {
  let result = command;
  for (const { pattern, replacement } of TSGo_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function replaceTsgoInText(
  content: string,
  options?: { docs?: boolean },
): string {
  if (options?.docs) {
    return replaceTsgoInCommand(content);
  }
  return content;
}

export function replaceTsgoInRunLine(line: string): string {
  const match = /^(\s*-?\s*run:\s*)(.*)$/u.exec(line);
  if (!match) return line;
  return `${match[1]}${replaceTsgoInCommand(match[2] ?? "")}`;
}

export function addTscFlags(
  command: string,
  opts: { checkers?: number; builders?: number },
): string {
  let result = command;
  if (
    opts.builders !== undefined &&
    /\btsc\s+(-b|--build)\b/.test(result) &&
    !/--builders/.test(result)
  ) {
    result = result.replace(/\btsc\b/, `tsc --builders ${opts.builders}`);
  }
  if (opts.checkers !== undefined && /\btsc\b/.test(result) && !/--checkers/.test(result)) {
    result = result.replace(/\btsc\b/, `tsc --checkers ${opts.checkers}`);
  }
  return result;
}
