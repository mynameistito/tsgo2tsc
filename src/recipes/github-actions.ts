import type { MigrationAction, ProjectContext } from "../types.js";
import { scanCiFiles } from "../scanners/ci.js";
import { replaceTsgoInCommand } from "../patchers/text.js";

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
  return lines
    .map((line) => {
      if (!/\btsgo\b/.test(line)) return line;
      return replaceTsgoInCommand(line);
    })
    .join("\n");
}
