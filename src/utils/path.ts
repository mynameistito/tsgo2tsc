import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const resolveTargetDir = (input?: string): string => {
  const target = path.resolve(
    process.cwd(),
    (input?.trim() || ".").replaceAll("\\", "/")
  );

  if (!existsSync(target)) {
    throw new Error(`Directory not found: ${target}`);
  }

  if (!statSync(target).isDirectory()) {
    throw new Error(`Project path is not a directory: ${target}`);
  }

  if (!existsSync(path.resolve(target, "package.json"))) {
    throw new Error(`No package.json found in ${target}`);
  }

  return target;
};
