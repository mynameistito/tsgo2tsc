import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PackageManager } from "../types.js";

const LOCKFILE_ORDER: { file: string; pm: PackageManager }[] = [
  { file: "bun.lock", pm: "bun" },
  { file: "bun.lockb", pm: "bun" },
  { file: "pnpm-lock.yaml", pm: "pnpm" },
  { file: "yarn.lock", pm: "yarn" },
  { file: "package-lock.json", pm: "npm" },
];

export function detectPackageManager(rootDir: string): PackageManager {
  for (const { file, pm } of LOCKFILE_ORDER) {
    if (existsSync(join(rootDir, file))) {
      return pm;
    }
  }
  const declared = readDeclaredPackageManager(rootDir);
  if (declared) {
    return declared;
  }
  return "npm";
}

function readDeclaredPackageManager(rootDir: string): PackageManager | null {
  try {
    const pkg = JSON.parse(
      readFileSync(join(rootDir, "package.json"), "utf-8")
    ) as {
      packageManager?: string;
    };
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
}

export function resolvePackageManager(
  rootDir: string,
  override: PackageManager | "auto"
): PackageManager {
  if (override !== "auto") {
    return override;
  }
  return detectPackageManager(rootDir);
}

export function installCommand(pm: PackageManager): [string, string[]] {
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
  }
}

export function runScriptCommand(
  pm: PackageManager,
  script: string
): [string, string[]] {
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
  }
}

export function tscCommand(
  pm: PackageManager,
  args: string[]
): [string, string[]] {
  return binaryCommand(pm, "tsc", args);
}

export function tsc6Command(
  pm: PackageManager,
  args: string[]
): [string, string[]] {
  return binaryCommand(pm, "tsc6", args);
}

function binaryCommand(
  pm: PackageManager,
  binary: string,
  args: string[]
): [string, string[]] {
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
  }
}
