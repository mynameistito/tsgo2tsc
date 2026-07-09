import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function resolveTargetDir(input?: string): string {
  const target = resolve(process.cwd(), (input?.trim() || ".").replace(/\\/g, "/"));

  if (!existsSync(target)) {
    throw new Error(`Directory not found: ${target}`);
  }

  if (!existsSync(resolve(target, "package.json"))) {
    throw new Error(`No package.json found in ${target}`);
  }

  return target;
}
