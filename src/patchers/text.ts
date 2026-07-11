/** Token-safe tsgo -> tsc replacements in command strings */
const TSGo_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  {
    pattern: /(^|[;&|({}\s/])bunx\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$1bunx tsc",
  },
  {
    pattern: /(^|[;&|({}\s/])npx\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$1npx tsc",
  },
  {
    pattern: /(^|[;&|({}\s/])pnpm\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$1pnpm tsc",
  },
  {
    pattern: /(^|[;&|({}\s/])yarn\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$1yarn tsc",
  },
  {
    pattern: /(^|[;&|({}\s/])tsgo\s+--build\b/gu,
    replacement: "$1tsc --build",
  },
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
  options?: { docs?: boolean }
): string {
  if (options?.docs) {
    return replaceTsgoInCommand(content);
  }
  return content;
}

export function replaceTsgoInRunLine(line: string): string {
  const match = /^(\s*-?\s*run:\s*)(.*)$/u.exec(line);
  if (!match) {
    return line;
  }
  return `${match[1]}${replaceTsgoInCommand(match[2] ?? "")}`;
}

export function addTscFlags(
  command: string,
  opts: { checkers?: number; builders?: number }
): string {
  const wantsBuilders =
    opts.builders !== undefined &&
    /\btsc\s+(-b|--build)\b/.test(command) &&
    !/--builders/.test(command);
  const wantsCheckers =
    opts.checkers !== undefined &&
    /\btsc\b/.test(command) &&
    !/--checkers/.test(command);

  if (!wantsBuilders && !wantsCheckers) {
    return command;
  }

  // Insert both flags in one replacement so checkers never breaks the
  // `tsc -b` / `tsc --build` match used to decide builders.
  const flags: string[] = [];
  if (wantsBuilders) {
    flags.push(`--builders ${opts.builders}`);
  }
  if (wantsCheckers) {
    flags.push(`--checkers ${opts.checkers}`);
  }

  return command.replace(/\btsc\b/, `tsc ${flags.join(" ")}`);
}
