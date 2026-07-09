import type { CompatMode, MigrateOptions, PackageManager } from "../types.js";
import { resolveTargetDir } from "../utils/path.js";

export interface CliMigrateOptions {
  nightly?: boolean;
  stable?: boolean;
  compat?: CompatMode;
  pm?: PackageManager | "auto";
  dryRun?: boolean;
  write?: boolean;
  install?: boolean;
  test?: boolean;
  updateCi?: boolean;
  updateVscode?: boolean;
  fixTsconfig?: boolean;
  updateDocs?: boolean;
  checkers?: number;
  builders?: number;
  include?: string[];
  exclude?: string[];
  yes?: boolean;
  /** Positional directory or --cwd */
  dir?: string;
  cwd?: string;
}

export function resolveMigrateOptions(opts: CliMigrateOptions): MigrateOptions {
  const target = resolveTargetDir(opts.cwd ?? opts.dir);

  return {
    nightly: opts.nightly ?? false,
    stable: opts.stable ?? false,
    compat: opts.compat ?? "auto",
    pm: opts.pm ?? "auto",
    dryRun: opts.dryRun ?? !opts.write,
    write: opts.write ?? false,
    install: opts.install ?? false,
    test: opts.test ?? false,
    updateCi: opts.updateCi ?? false,
    updateVscode: opts.updateVscode ?? false,
    fixTsconfig: opts.fixTsconfig ?? false,
    updateDocs: opts.updateDocs ?? false,
    checkers: opts.checkers,
    builders: opts.builders,
    include: opts.include,
    exclude: opts.exclude,
    yes: opts.yes ?? false,
    cwd: target,
  };
}
