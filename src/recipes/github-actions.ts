import {
  replaceTsgoInCommand,
  replaceTsgoInRunLine,
} from "../patchers/text.js";
import { scanCiFiles } from "../scanners/ci.js";
import type { MigrationAction, ProjectContext } from "../types.js";

const owningStepIndex = (lines: string[], index: number): number => {
  const line = lines[index] ?? "";
  if (/^\s*-(?:\s|$)/u.test(line)) {
    return index;
  }

  const lineIndent = /^(?<indent>\s*)/u.exec(line)?.groups?.indent.length ?? 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = lines[i] ?? "";
    if (prev.trim() === "") {
      continue;
    }
    const listItem = /^(?<indent>\s*)-(?:\s|$)/u.exec(prev);
    if (listItem && (listItem.groups?.indent.length ?? 0) < lineIndent) {
      return i;
    }
  }
  return index;
};

const patchCiContent = (content: string): string => {
  const lines = content.split("\n");
  const patched = lines.map((line) => {
    const runPatched = replaceTsgoInRunLine(line);
    if (runPatched !== line) {
      return runPatched;
    }
    // Multi-line `run: |` / `run: >` continuation lines have no `run:` key.
    if (/\btsgo\b/u.test(line)) {
      return replaceTsgoInCommand(line);
    }
    return line;
  });

  const bunxTscIndex = patched.findIndex((line, index) => {
    if (lines[index] === line) {
      return false;
    }
    return (
      /\brun:\s*bunx\s+tsc\b/u.test(line) || /^\s*bunx\s+tsc\b/u.test(line)
    );
  });
  if (
    bunxTscIndex !== -1 &&
    !patched.some((line) => /oven-sh\/setup-bun/u.test(line))
  ) {
    // Insert before the owning step list item, not the matched run/continuation line.
    const insertAt = owningStepIndex(patched, bunxTscIndex);
    const indent =
      /^(?<indent>\s*)/u.exec(patched[insertAt] ?? "")?.groups?.indent ?? "";
    patched.splice(insertAt, 0, `${indent}- uses: oven-sh/setup-bun@v1`);
  }
  return patched.join("\n");
};

export const planGithubActions = async (
  ctx: ProjectContext
): Promise<MigrationAction[]> => {
  if (!ctx.updateCi) {
    return [];
  }

  const ciFiles = await scanCiFiles(ctx);
  const actions: MigrationAction[] = [];

  for (const { file } of ciFiles) {
    actions.push({
      apply(content: string) {
        return patchCiContent(content);
      },
      description: "replace tsgo with tsc in CI workflow",
      path: file,
      searchHint: "tsgo",
      type: "patchFile",
    });
  }

  return actions;
};
