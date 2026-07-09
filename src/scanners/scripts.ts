import { scanPackageJson } from "./package-json.js";

export { scanPackageJson };

export function findTsgoScripts(
  scripts: Record<string, string> | undefined,
): Array<{ name: string; value: string }> {
  const results: Array<{ name: string; value: string }> = [];
  for (const [name, value] of Object.entries(scripts ?? {})) {
    if (/\btsgo\b/.test(value)) {
      results.push({ name, value });
    }
  }
  return results;
}
