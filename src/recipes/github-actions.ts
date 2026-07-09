import type { MigrationAction, ProjectContext } from "../types.js";
import { scanCiFiles } from "../scanners/ci.js";
import { replaceTsgoInRunLine } from "../patchers/text.js";

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
      apply(content: string) {
        return patchCiContent(content);
      },
    });
  }

  return actions;
}

function patchCiContent(content: string): string {
  const lines = content.split("\n");
  const patched = lines.map((line) => replaceTsgoInRunLine(line));
  const bunxTscIndex = patched.findIndex((line, index) =>
    lines[index] !== line && /\brun:\s*bunx\s+tsc\b/u.test(line),
  );
  if (bunxTscIndex >= 0 && !patched.some((line) => /oven-sh\/setup-bun/u.test(line))) {
    const indent = /^(\s*)/u.exec(patched[bunxTscIndex])?.[1] ?? "";
    patched.splice(bunxTscIndex, 0, `${indent}- uses: oven-sh/setup-bun@v1`);
  }
  return patched.join("\n");
}
