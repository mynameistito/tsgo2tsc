import { existsSync } from "node:fs";
import path from "node:path";

export const isGitRepo = (rootDir: string): boolean =>
  existsSync(path.join(rootDir, ".git"));
