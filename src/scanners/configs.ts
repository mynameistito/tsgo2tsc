import { readText } from "../utils/fs.js";
import { join } from "node:path";
import type { ProjectContext } from "../types.js";

const DEPRECATED_TSCONFIG_KEYS = [
  "importsNotUsedAsValues",
  "preserveValueImports",
  "suppressImplicitAnyIndexErrors",
  "keyofStringsOnly",
  "noImplicitUseStrict",
  "out",
  "charset",
] as const;

export async function scanTsconfigWarnings(
  ctx: ProjectContext,
): Promise<Array<{ file: string; message: string; severity: "info" | "warning" }>> {
  const warnings: Array<{ file: string; message: string; severity: "info" | "warning" }> = [];
  const tsconfigs = ctx.files.filter(
    (f) => /tsconfig.*\.json$/.test(f) || f.endsWith("tsconfig.json"),
  );

  for (const file of tsconfigs) {
    const content = await readText(file);
    if (!content) continue;

    try {
      const config = JSON.parse(stripJsonComments(content)) as {
        compilerOptions?: Record<string, unknown>;
      };
      const opts = config.compilerOptions ?? {};

      if (opts.moduleResolution === "node") {
        warnings.push({
          file,
          message:
            'moduleResolution "node" is deprecated; consider "bundler" for bundler-based projects',
          severity: "warning",
        });
      }

      if (opts.target === "ES3") {
        warnings.push({
          file,
          message: 'target "ES3" may behave differently in TS7',
          severity: "warning",
        });
      }

      for (const key of DEPRECATED_TSCONFIG_KEYS) {
        if (key in opts) {
          warnings.push({
            file,
            message: `compilerOptions.${key} is deprecated or may behave differently in TS7`,
            severity: "warning",
          });
        }
      }
    } catch {
      // skip invalid json
    }
  }

  return warnings;
}

function stripJsonComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
}

export async function scanTsdownDeclaration(
  ctx: ProjectContext,
): Promise<boolean> {
  const tsdownConfigs = ctx.files.filter((f) =>
    /tsdown\.config\.(js|mjs|ts)$/.test(f),
  );

  for (const file of tsdownConfigs) {
    const content = await readText(file);
    if (!content) continue;
    if (
      /\bdts\s*:\s*true\b/.test(content) ||
      /\bdeclaration\s*:\s*true\b/.test(content)
    ) {
      return true;
    }
  }

  return false;
}
