import type { MigrationAction, ProjectContext } from "../types.js";
import { scanCiFiles } from "../scanners/ci.js";
import {
  replaceTsgoInCommand,
  replaceTsgoInRunLine,
} from "../patchers/text.js";

export async function planGithubActions(
  ctx: ProjectContext,
): Promise<MigrationAction[]> {
  if (!ctx.updateCi) return [];

  const ciFiles = await scanCiFiles(ctx);
  const actions: MigrationAction[] = [];

  for (const { file } of ciFiles) {
    actions.push({
      type: "patchFile",
      path: file,
      description: "replace tsgo with tsc in CI workflow",
      searchHint: "tsgo",
      apply(content: string) {
        return patchCiContent(content);
      },
    });
  }

  return actions;
}

function patchCiContent(content: string): string {
  const lines = content.split("\n");
  const patched = lines.map((line) => {
    const runPatched = replaceTsgoInRunLine(line);
    if (runPatched !== line) return runPatched;
    // Multi-line `run: |` / `run: >` continuation lines have no `run:` key.
    if (/\btsgo\b/u.test(line)) {
      return replaceTsgoInCommand(line);
    }
    return line;
  });

  const bunxTscIndex = patched.findIndex((line, index) => {
    if (lines[index] === line) return false;
    return /\brun:\s*bunx\s+tsc\b/u.test(line) || /^\s*bunx\s+tsc\b/u.test(line);
  });
  if (
    bunxTscIndex >= 0 &&
    !patched.some((line) => /oven-sh\/setup-bun/u.test(line))
  ) {
    // Insert before the owning step list item, not the matched run/continuation line.
    const insertAt = owningStepIndex(patched, bunxTscIndex);
    const indent = /^(\s*)/u.exec(patched[insertAt] ?? "")?.[1] ?? "";
    patched.splice(insertAt, 0, `${indent}- uses: oven-sh/setup-bun@v1`);
  }
  return patched.join("\n");
}

/**
 * Index of the owning `- ` step for a step property or multiline `run:` body line.
 * Continuation lines and nested keys must not be treated as insertion points.
 */
function owningStepIndex(lines: string[], index: number): number {
  const line = lines[index] ?? "";
  if (/^\s*-\s+/u.test(line)) return index;

  const lineIndent = /^(\s*)/u.exec(line)?.[1]?.length ?? 0;
  for (let i = index - 1; i >= 0; i--) {
    const prev = lines[i] ?? "";
    if (prev.trim() === "") continue;
    const listItem = /^(\s*)-\s+/u.exec(prev);
    if (listItem && (listItem[1]?.length ?? 0) < lineIndent) {
      return i;
    }
  }
  return index;
}
