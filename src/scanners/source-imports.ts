import type { ProjectContext } from "../types.js";
import { readText } from "../utils/fs.js";

const TYPESCRIPT_IMPORT_PATTERNS = [
  /\bimport\s+ts\s+from\s+["']typescript["']/u,
  /\bimport\s+\*\s+as\s+ts\s+from\s+["']typescript["']/u,
  /\brequire\s*\(\s*["']typescript["']\s*\)/u,
  /\bawait\s+import\s*\(\s*["']typescript["']\s*\)/u,
  /\bfrom\s+["']typescript["']/u,
];
const MAX_CONCURRENT_FILE_READS = 16;

interface SourceImportHit {
  file: string;
  line?: number;
}

const scanSourceFile = async (
  file: string
): Promise<SourceImportHit | null> => {
  const content = await readText(file);
  if (!content) {
    return null;
  }

  for (const pattern of TYPESCRIPT_IMPORT_PATTERNS) {
    if (pattern.test(content)) {
      const line = content
        .split("\n")
        .findIndex((value) => pattern.test(value));
      return line === -1 ? { file } : { file, line: line + 1 };
    }
  }
  return null;
};

export const scanSourceImports = async (
  ctx: ProjectContext
): Promise<SourceImportHit[]> => {
  const sourceFiles = ctx.files.filter((file) =>
    /\.(?:ts|tsx|js|mjs|cjs)$/u.test(file)
  );
  const hits: (SourceImportHit | null)[] = [];
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    const index = nextIndex;
    nextIndex += 1;
    const file = sourceFiles[index];
    if (!file) {
      return;
    }
    hits[index] = await scanSourceFile(file);
    await worker();
  };

  const workerCount = Math.min(MAX_CONCURRENT_FILE_READS, sourceFiles.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return hits.filter((hit): hit is SourceImportHit => hit !== null);
};
