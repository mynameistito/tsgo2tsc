import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { PackageManager } from "../types.js";

const LOCKFILE_ORDER: { file: string; pm: PackageManager }[] = [
  { file: "bun.lock", pm: "bun" },
  { file: "bun.lockb", pm: "bun" },
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "package-lock.json", pm: "npm" },
];

const readDeclaredPackageManager = (rootDir: string): PackageManager | null => {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(rootDir, "package.json"), "utf-8")
    ) as { packageManager?: string };
    const manager = pkg.packageManager?.split("@")[0];
    return manager === "bun" ||
      manager === "npm" ||
      manager === "pnpm" ||
      manager === "yarn"
      ? manager
      : null;
  } catch {
    return null;
  }
};

const binaryCommand = (
  pm: PackageManager,
  binary: string,
  args: string[]
): [string, string[]] => {
  switch (pm) {
    case "bun": {
      return ["bunx", [binary, ...args]];
    }
    case "pnpm": {
      return ["pnpm", ["exec", binary, ...args]];
    }
    case "yarn": {
      return ["yarn", [binary, ...args]];
    }
    case "npm": {
      return ["npx", [binary, ...args]];
    }
    default: {
      throw new Error(`Unsupported package manager: ${pm}`);
    }
  }
};

export const detectPackageManager = (rootDir: string): PackageManager => {
  for (const { file, pm } of LOCKFILE_ORDER) {
    if (existsSync(path.join(rootDir, file))) {
      return pm;
    }
  }
  return readDeclaredPackageManager(rootDir) ?? "npm";
};

export const resolvePackageManager = (
  rootDir: string,
  override: PackageManager | "auto"
): PackageManager =>
  override === "auto" ? detectPackageManager(rootDir) : override;

export const installCommand = (pm: PackageManager): [string, string[]] => {
  switch (pm) {
    case "bun": {
      return ["bun", ["install"]];
    }
    case "pnpm": {
      return ["pnpm", ["install"]];
    }
    case "yarn": {
      return ["yarn", ["install"]];
    }
    case "npm": {
      return ["npm", ["install"]];
    }
    default: {
      throw new Error(`Unsupported package manager: ${pm}`);
    }
  }
};

export const runScriptCommand = (
  pm: PackageManager,
  script: string
): [string, string[]] => {
  switch (pm) {
    case "bun": {
      return ["bun", ["run", script]];
    }
    case "pnpm": {
      return ["pnpm", ["run", script]];
    }
    case "yarn": {
      return ["yarn", [script]];
    }
    case "npm": {
      return ["npm", ["run", script]];
    }
    default: {
      throw new Error(`Unsupported package manager: ${pm}`);
    }
  }
};

export const tscCommand = (
  pm: PackageManager,
  args: string[]
): [string, string[]] => binaryCommand(pm, "tsc", args);

export const tsc6Command = (
  pm: PackageManager,
  args: string[]
): [string, string[]] => binaryCommand(pm, "tsc6", args);
