/** Token-safe tsgo -> tsc replacements in command strings */
const TSGo_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  {
    pattern: /(?<prefix>^|[;&|({}\s/])bunx\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$<prefix>bunx tsc",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])npx\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$<prefix>npx tsc",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])pnpm\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$<prefix>pnpm tsc",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])yarn\s+tsgo(?=$|[\s;&|)])/gu,
    replacement: "$<prefix>yarn tsc",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])tsgo\s+--build\b/gu,
    replacement: "$<prefix>tsc --build",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])tsgo\s+-b\b/gu,
    replacement: "$<prefix>tsc -b",
  },
  {
    pattern: /(?<prefix>^|[;&|({}\s/])tsgo(?=$|[\s;&|)])/gu,
    replacement: "$<prefix>tsc",
  },
];

export const replaceTsgoInCommand = (command: string): string => {
  let result = command;
  for (const { pattern, replacement } of TSGo_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

export const replaceTsgoInText = (
  content: string,
  options?: { docs?: boolean }
): string => {
  if (options?.docs) {
    return replaceTsgoInCommand(content);
  }
  return content;
};

export const replaceTsgoInRunLine = (line: string): string => {
  const match = /^(?<prefix>\s*-?\s*run:\s*)(?<command>.*)$/u.exec(line);
  if (!match) {
    return line;
  }
  return `${match.groups?.prefix ?? ""}${replaceTsgoInCommand(match.groups?.command ?? "")}`;
};

export const addTscFlags = (
  command: string,
  opts: { checkers?: number; builders?: number }
): string => {
  const wantsBuilders =
    opts.builders !== undefined &&
    /\btsc\s+(?:-b|--build)\b/u.test(command) &&
    !/--builders/u.test(command);
  const wantsCheckers =
    opts.checkers !== undefined &&
    /\btsc\b/u.test(command) &&
    !/--checkers/u.test(command);

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

  return command.replace(/\btsc\b/u, `tsc ${flags.join(" ")}`);
};
