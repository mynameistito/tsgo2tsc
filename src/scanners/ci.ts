import { readText } from "../utils/fs.js";
import { hasTsgoInvocation } from "./package-json.js";
import type { ProjectContext } from "../types.js";

export async function scanCiFiles(
  ctx: ProjectContext,
): Promise<Array<{ file: string; hasTsgo: boolean }>> {
  const ciFiles = ctx.files.filter((f) =>
    /\.github\/workflows\/.*\.(yml|yaml)$/.test(f.replace(/\\/g, "/")),
  );

  const results: Array<{ file: string; hasTsgo: boolean }> = [];

  for (const file of ciFiles) {
    const content = await readText(file);
    if (!content) continue;
    if (content.split("\n").some((line) => hasTsgoInvocation(line))) {
      results.push({ file, hasTsgo: true });
    }
  }

  return results;
}
