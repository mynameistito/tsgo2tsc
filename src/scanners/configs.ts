import { parseJsonc } from "../patchers/jsonc.js";
import type { ProjectContext } from "../types.js";
import { readText } from "../utils/fs.js";

const DEPRECATED_TSCONFIG_KEYS = [
  "importsNotUsedAsValues",
  "preserveValueImports",
  "suppressImplicitAnyIndexErrors",
  "keyofStringsOnly",
  "noImplicitUseStrict",
  "out",
  "charset",
] as const;

const stripComments = (content: string): string => {
  let result = "";
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      result += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (i < content.length && content[i] !== "\n") {
        i += 1;
      }
      result += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (
        i < content.length &&
        !(content[i] === "*" && content[i + 1] === "/")
      ) {
        if (content[i] === "\n") {
          result += "\n";
        }
        i += 1;
      }
      i += 1;
      continue;
    }

    result += char;
  }

  return result;
};

export const scanTsconfigWarnings = async (
  ctx: ProjectContext
): Promise<
  { file: string; message: string; severity: "info" | "warning" }[]
> => {
  const warnings: {
    file: string;
    message: string;
    severity: "info" | "warning";
  }[] = [];
  const tsconfigs = ctx.files.filter(
    (f) => /tsconfig.*\.json$/u.test(f) || f.endsWith("tsconfig.json")
  );
  const contents = await Promise.all(tsconfigs.map((file) => readText(file)));

  for (const [index, file] of tsconfigs.entries()) {
    const content = contents[index];
    if (!content) {
      continue;
    }

    try {
      const config = parseJsonc<{
        compilerOptions?: Record<string, unknown>;
      }>(content);
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
};

export const scanTsdownDeclaration = async (
  ctx: ProjectContext
): Promise<boolean> => {
  const tsdownConfigs = ctx.files.filter((f) =>
    /tsdown\.config\.(?<extension>js|mjs|ts)$/u.test(f)
  );
  const contents = await Promise.all(
    tsdownConfigs.map((file) => readText(file))
  );

  for (const content of contents) {
    if (!content) {
      continue;
    }
    const uncommented = stripComments(content);
    if (
      /\bdts\s*:\s*true\b/u.test(uncommented) ||
      /\bdeclaration\s*:\s*true\b/u.test(uncommented)
    ) {
      return true;
    }
  }

  return false;
};
