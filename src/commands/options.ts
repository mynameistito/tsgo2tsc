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
    builders: opts.builders,
    checkers: opts.checkers,
    compat: opts.compat ?? "auto",
    cwd: target,
    dryRun: opts.dryRun ?? !opts.write,
    exclude: opts.exclude,
    fixTsconfig: opts.fixTsconfig ?? false,
    include: opts.include,
    install: opts.install ?? false,
    nightly: opts.nightly ?? false,
    pm: opts.pm ?? "auto",
    stable: opts.stable ?? false,
    test: opts.test ?? false,
    updateCi: opts.updateCi ?? false,
    updateDocs: opts.updateDocs ?? false,
    updateVscode: opts.updateVscode ?? false,
    write: opts.write ?? false,
    yes: opts.yes ?? false,
  };
}
