import { readText } from "../utils/fs.js";
import type { ProjectContext } from "../types.js";

const TYPESCRIPT_IMPORT_PATTERNS = [
  /\bimport\s+ts\s+from\s+["']typescript["']/,
  /\bimport\s+\*\s+as\s+ts\s+from\s+["']typescript["']/,
  /\brequire\s*\(\s*["']typescript["']\s*\)/,
  /\bawait\s+import\s*\(\s*["']typescript["']\s*\)/,
  /\bfrom\s+["']typescript["']/,
];

export async function scanSourceImports(
  ctx: ProjectContext,
): Promise<Array<{ file: string; line?: number }>> {
  const hits: Array<{ file: string; line?: number }> = [];

  const sourceFiles = ctx.files.filter((f) =>
    /\.(ts|tsx|js|mjs|cjs)$/.test(f),
  );

  for (const file of sourceFiles) {
    const content = await readText(file);
    if (!content) continue;

    for (const pattern of TYPESCRIPT_IMPORT_PATTERNS) {
      if (pattern.test(content)) {
        const line = content.split("\n").findIndex((l) => pattern.test(l));
        hits.push({ file, line: line >= 0 ? line + 1 : undefined });
        break;
      }
    }
  }

  return hits;
}
