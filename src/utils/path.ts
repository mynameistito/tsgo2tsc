import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

export function resolveTargetDir(input?: string): string {
  const target = resolve(
    process.cwd(),
    (input?.trim() || ".").replaceAll("\\", "/")
  );

  if (!existsSync(target)) {
    throw new Error(`Directory not found: ${target}`);
  }

  if (!statSync(target).isDirectory()) {
    throw new Error(`Project path is not a directory: ${target}`);
  }

  if (!existsSync(resolve(target, "package.json"))) {
    throw new Error(`No package.json found in ${target}`);
  }

  return target;
}
