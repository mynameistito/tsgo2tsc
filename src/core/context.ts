import type { MigrateOptions, ProjectContext } from "../types.js";
import { scanProjectFiles } from "../utils/glob.js";
import { resolvePackageManager } from "./package-manager.js";
import { discoverWorkspaces } from "./workspace.js";

export async function buildProjectContext(
  options: MigrateOptions
): Promise<ProjectContext> {
  const packageManager = resolvePackageManager(options.cwd, options.pm);
  const files = await scanProjectFiles(
    options.cwd,
    options.include,
    options.exclude
  );
  // Include/exclude only scopes scanned files. Package discovery stays
  // independent so `--include "src/**/*.ts"` does not drop every package.
  const packages = await discoverWorkspaces(options.cwd);

  return {
    builders: options.builders,
    checkers: options.checkers,
    compat: options.compat,
    excludeGlobs: options.exclude,
    files,
    fixTsconfig: options.fixTsconfig,
    includeGlobs: options.include,
    nightly: options.nightly && !options.stable,
    packageManager,
    packages,
    rootDir: options.cwd,
    updateCi: options.updateCi,
    updateDocs: options.updateDocs,
    updateVscode: options.updateVscode,
  };
}
