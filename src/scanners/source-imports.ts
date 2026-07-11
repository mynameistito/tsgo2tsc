import type { ProjectContext } from "../types.js";
import { readText } from "../utils/fs.js";

const TYPESCRIPT_IMPORT_PATTERNS = [
  /\bimport\s+ts\s+from\s+["']typescript["']/u,
  /\bimport\s+\*\s+as\s+ts\s+from\s+["']typescript["']/u,
  /\brequire\s*\(\s*["']typescript["']\s*\)/u,
  /\bawait\s+import\s*\(\s*["']typescript["']\s*\)/u,
  /\bfrom\s+["']typescript["']/u,
];

export const scanSourceImports = async (
  ctx: ProjectContext
): Promise<{ file: string; line?: number }[]> => {
  const sourceFiles = ctx.files.filter((file) =>
    /\.(?:ts|tsx|js|mjs|cjs)$/u.test(file)
  );
  const scans = await Promise.all(
    sourceFiles.map(async (file) => {
      const content = await readText(file);
      if (!content) {
        return null;
      }

      for (const pattern of TYPESCRIPT_IMPORT_PATTERNS) {
        if (pattern.test(content)) {
          const line = content.split("\n").findIndex((value) => pattern.test(value));
          return line === -1 ? { file } : { file, line: line + 1 };
        }
      }
      return null;
    })
  );
  return scans.filter((scan): scan is Exclude<typeof scan, null> => scan !== null);
};
