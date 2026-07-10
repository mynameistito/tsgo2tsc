import { existsSync } from "node:fs";
import { join } from "node:path";

export function isGitRepo(rootDir: string): boolean {
  return existsSync(join(rootDir, ".git"));
}
