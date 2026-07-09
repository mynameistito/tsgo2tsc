/** Token-safe tsgo -> tsc replacements in command strings */
const TSGo_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bbunx\s+tsgo\b/g, replacement: "bunx tsc" },
  { pattern: /\bnpx\s+tsgo\b/g, replacement: "npx tsc" },
  { pattern: /\bpnpm\s+tsgo\b/g, replacement: "pnpm tsc" },
  { pattern: /\byarn\s+tsgo\b/g, replacement: "yarn tsc" },
  { pattern: /\btsgo\s+--build\b/g, replacement: "tsc --build" },
  { pattern: /\btsgo\s+-b\b/g, replacement: "tsc -b" },
  { pattern: /\btsgo\b/g, replacement: "tsc" },
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

export function addTscFlags(
  command: string,
  opts: { checkers?: number; builders?: number },
): string {
  let result = command;
  if (opts.checkers !== undefined && /\btsc\b/.test(result) && !/--checkers/.test(result)) {
    result = result.replace(/\btsc\b/, `tsc --checkers ${opts.checkers}`);
  }
  if (
    opts.builders !== undefined &&
    /\btsc\s+(-b|--build)\b/.test(result) &&
    !/--builders/.test(result)
  ) {
    result = result.replace(/\btsc\b/, `tsc --builders ${opts.builders}`);
  }
  return result;
}
