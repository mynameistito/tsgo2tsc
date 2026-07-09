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
    const indent = stepListIndent(patched, bunxTscIndex);
    patched.splice(bunxTscIndex, 0, `${indent}- uses: oven-sh/setup-bun@v1`);
  }
  return patched.join("\n");
}

/** Indent of the owning `- ` list item for a step property or `- run:` line. */
function stepListIndent(lines: string[], index: number): string {
  const line = lines[index] ?? "";
  const runListItem = /^(\s*)-\s*run:/u.exec(line);
  if (runListItem) return runListItem[1] ?? "";

  const propIndent = /^(\s*)/u.exec(line)?.[1] ?? "";
  for (let i = index - 1; i >= 0; i--) {
    const prev = lines[i] ?? "";
    if (prev.trim() === "") continue;
    const listItem = /^(\s*)-\s+/u.exec(prev);
    if (listItem && (listItem[1]?.length ?? 0) < propIndent.length) {
      return listItem[1] ?? "";
    }
    // Left the current step block without finding a list marker.
    if ((/^(\s*)/u.exec(prev)?.[1]?.length ?? 0) < propIndent.length) {
      break;
    }
  }

  return propIndent.slice(0, Math.max(0, propIndent.length - 2));
}
