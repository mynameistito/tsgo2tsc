import { existsSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import YAML from "yaml";
import { readText } from "../utils/fs.js";
import type { PackageJson, WorkspacePackage } from "../types.js";

export async function discoverWorkspaces(
  rootDir: string,
): Promise<WorkspacePackage[]> {
  const rootPkgPath = join(rootDir, "package.json");
  const rootContent = await readText(rootPkgPath);
  if (!rootContent) {
    return [];
  }

  let rootPkg: PackageJson;
  try {
    rootPkg = JSON.parse(rootContent) as PackageJson;
  } catch {
    return [];
  }
  const patterns = await getWorkspacePatterns(rootDir, rootPkg);

  const dirs = new Set<string>(["."]);

  if (patterns.length > 0) {
    const matches = await fg(patterns, {
      cwd: rootDir,
      onlyDirectories: true,
      absolute: false,
    });
    for (const match of matches) {
      const normalized = match.replace(/\\/g, "/");
      if (existsSync(join(rootDir, normalized, "package.json"))) {
        dirs.add(normalized);
      }
    }
  }

  const packages: WorkspacePackage[] = [];

  for (const dir of [...dirs].sort()) {
    const packageJsonPath =
      dir === "." ? rootPkgPath : join(rootDir, dir, "package.json");
    const content = await readText(packageJsonPath);
    if (!content) continue;

    try {
      packages.push({
        dir: dir === "." ? "." : dir.replace(/\\/g, "/"),
        packageJsonPath,
        packageJson: JSON.parse(content) as PackageJson,
      });
    } catch {
      // skip invalid package.json and continue scanning
    }
  }

  return packages;
}

async function getWorkspacePatterns(
  rootDir: string,
  rootPkg: PackageJson,
): Promise<string[]> {
  if (rootPkg.workspaces) {
    if (Array.isArray(rootPkg.workspaces)) {
      return rootPkg.workspaces;
    }
    if (
      typeof rootPkg.workspaces === "object" &&
      Array.isArray(rootPkg.workspaces.packages)
    ) {
      return rootPkg.workspaces.packages;
    }
  }

  const pnpmWorkspace = join(rootDir, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspace)) {
    return readPnpmWorkspaces(pnpmWorkspace);
  }

  return [];
}

async function readPnpmWorkspaces(path: string): Promise<string[]> {
  const content = await readText(path);
  if (!content) return [];
  try {
    const doc = YAML.parse(content) as { packages?: string[] };
    return doc.packages ?? [];
  } catch {
    return [];
  }
}

export function getAllDependencies(pkg: PackageJson): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}

export function hasDependency(pkg: PackageJson, name: string): boolean {
  return name in getAllDependencies(pkg);
}

export function findDependencySection(
  pkg: PackageJson,
  name: string,
): "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies" | null {
  if (pkg.dependencies && name in pkg.dependencies) return "dependencies";
  if (pkg.devDependencies && name in pkg.devDependencies) return "devDependencies";
  if (pkg.peerDependencies && name in pkg.peerDependencies) return "peerDependencies";
  if (pkg.optionalDependencies && name in pkg.optionalDependencies) return "optionalDependencies";
  return null;
}
