import { scanProjectFiles } from "../utils/glob.js";
import { discoverWorkspaces } from "./workspace.js";
import { resolvePackageManager } from "./package-manager.js";
import type { MigrateOptions, ProjectContext } from "../types.js";

export async function buildProjectContext(
  options: MigrateOptions,
): Promise<ProjectContext> {
  const packageManager = resolvePackageManager(options.cwd, options.pm);
  const files = await scanProjectFiles(
    options.cwd,
    options.include,
    options.exclude,
  );
  const discoveredPackages = await discoverWorkspaces(options.cwd);
  const fileSet = new Set(files.map((file) => file.replace(/\\/g, "/")));
  const packages = options.include || options.exclude
    ? discoveredPackages.filter((pkg) => fileSet.has(pkg.packageJsonPath.replace(/\\/g, "/")))
    : discoveredPackages;

  return {
    rootDir: options.cwd,
    packageManager,
    packages,
    files,
    nightly: options.nightly && !options.stable,
    compat: options.compat,
    updateCi: options.updateCi,
    updateVscode: options.updateVscode,
    fixTsconfig: options.fixTsconfig,
    updateDocs: options.updateDocs,
    checkers: options.checkers,
    builders: options.builders,
    includeGlobs: options.include,
    excludeGlobs: options.exclude,
  };
}
