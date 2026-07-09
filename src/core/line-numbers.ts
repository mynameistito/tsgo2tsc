import type { MigrationAction } from "../types.js";

export function getLineContent(content: string, line: number): string {
  const lines = content.split("\n");
  return lines[line - 1]?.trimEnd() ?? "";
}

export function findLineContaining(
  content: string,
  needle: string | RegExp,
): number | null {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const matches =
      typeof needle === "string" ? line.includes(needle) : needle.test(line);
    if (matches) return i + 1;
  }
  return null;
}

export function findDependencyInsertLine(
  content: string,
  section: string,
): number {
  const lines = content.split("\n");
  let inSection = false;
  let sectionStart = 1;
  let lastDepLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes(`"${section}"`)) {
      inSection = true;
      sectionStart = i + 2;
      continue;
    }
    if (!inSection) continue;

    if (/^\s*},?\s*$/.test(line)) {
      return lastDepLine > 0 ? lastDepLine + 1 : sectionStart;
    }
    if (line.includes('":')) {
      lastDepLine = i + 1;
    }
  }

  return lastDepLine > 0 ? lastDepLine + 1 : sectionStart;
}

export function resolveActionLines(
  content: string,
  action: MigrationAction,
): { minusLine?: number; plusLine?: number } {
  switch (action.type) {
    case "removeDependency": {
      const line = findLineContaining(content, `"${action.name}"`);
      return { minusLine: line ?? undefined, plusLine: line ?? undefined };
    }
    case "addDependency": {
      const existing = findLineContaining(content, `"${action.name}"`);
      if (existing) {
        return { minusLine: existing, plusLine: existing };
      }
      return {
        plusLine: findDependencyInsertLine(content, action.section),
      };
    }
    case "replaceScriptToken": {
      const line =
        findLineContaining(content, `"${action.scriptName}"`) ??
        findLineContaining(content, "tsgo");
      return { minusLine: line ?? undefined, plusLine: line ?? undefined };
    }
    case "patchFile": {
      const line = resolvePatchLine(content, action.description);
      return { minusLine: line ?? undefined, plusLine: line ?? undefined };
    }
    default:
      return {};
  }
}

function resolvePatchLine(
  content: string,
  description: string,
): number | null {
  if (description.includes("useTsgo")) {
    return findLineContaining(content, "useTsgo");
  }
  if (description.includes("typescript.tsdk")) {
    return findLineContaining(content, "typescript.tsdk");
  }
  if (description.includes("tsgo")) {
    return findLineContaining(content, "tsgo");
  }
  return null;
}

export function formatAddedDependencyLine(
  name: string,
  version: string,
): string {
  return `    "${name}": "${version}",`;
}
