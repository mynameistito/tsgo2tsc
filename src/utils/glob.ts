import fg from "fast-glob";
import { join } from "node:path";

const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.git/**",
  "**/.turbo/**",
  "**/.next/**",
  "**/.output/**",
  "**/.tsgo2tsc/**",
  "**/examples/**",
  "**/fixtures/**",
  "**/__fixtures__/**",
];

const SCAN_PATTERNS = [
  "package.json",
  "**/package.json",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "npm-shrinkwrap.json",
  "**/tsconfig.json",
  "**/tsconfig.*.json",
  "**/eslint.config.js",
  "**/eslint.config.mjs",
  "**/eslint.config.ts",
  "**/eslint.config.cjs",
  "**/tsdown.config.js",
  "**/tsdown.config.mjs",
  "**/tsdown.config.ts",
  "**/tsdown.config.cjs",
  "**/typedoc.json",
  "**/api-extractor.json",
  "turbo.json",
  "nx.json",
  "moon.yml",
  "lefthook.yml",
  ".github/workflows/*.yml",
  ".github/workflows/*.yaml",
  ".vscode/settings.json",
  ".vscode/extensions.json",
  "README.md",
  "docs/**/*.md",
  "**/scripts/**/*.{js,ts,mjs,cjs}",
  "**/src/**/*.{js,ts,tsx,mjs,cjs}",
];

export async function scanProjectFiles(
  rootDir: string,
  include?: string[],
  exclude?: string[],
): Promise<string[]> {
  const patterns =
    include && include.length > 0 ? include : SCAN_PATTERNS;
  const ignore = [...DEFAULT_IGNORE, ...(exclude ?? [])];

  const files = await fg(patterns, {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    dot: true,
    ignore,
  });

  return [...new Set(files)].sort();
}
