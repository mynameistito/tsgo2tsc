#!/usr/bin/env node
import { Command } from "commander";

import { runDoctor } from "./commands/doctor.js";
import { runMigrate } from "./commands/migrate.js";
import { resolveMigrateOptions } from "./commands/options.js";
import type { CliMigrateOptions } from "./commands/options.js";
import { runRollback } from "./commands/rollback.js";
import { runScan } from "./commands/scan.js";
import { resolveTargetDir } from "./utils/path.js";

const program = new Command();

program
  .name("tsgo2tsc")
  .description(
    "Migrate projects from @typescript/native-preview and tsgo to TypeScript 7 tsc"
  )
  .version("0.1.0");

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseChoice<T extends string>(
  value: string,
  choices: readonly T[]
): T {
  if (choices.includes(value as T)) {
    return value as T;
  }
  throw new Error(
    `Invalid value "${value}". Expected one of: ${choices.join(", ")}`
  );
}

function sharedOptions(cmd: Command): Command {
  return cmd
    .argument("[dir]", "Project directory", ".")
    .option("--cwd <dir>", "Project directory (same as positional [dir])")
    .option("--nightly", "Use typescript@next instead of stable typescript")
    .option("--stable", "Explicitly use stable typescript")
    .option(
      "--compat <mode>",
      "Compatibility mode: auto, force, or off",
      (value) => parseChoice(value, ["auto", "force", "off"] as const),
      "auto"
    )
    .option(
      "--pm <manager>",
      "Package manager: auto, bun, npm, pnpm, or yarn",
      (value) =>
        parseChoice(value, ["auto", "bun", "npm", "pnpm", "yarn"] as const),
      "auto"
    )
    .option(
      "--include <glob>",
      "Include glob pattern (repeatable)",
      collect,
      []
    )
    .option(
      "--exclude <glob>",
      "Exclude glob pattern (repeatable)",
      collect,
      []
    );
}

function parseIntOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new TypeError(`Invalid number: ${value}`);
  }
  return Math.trunc(Number(parsed));
}

function toOptions(
  dir: string,
  opts: Record<string, unknown>
): CliMigrateOptions {
  return {
    builders: opts.builders as number | undefined,
    checkers: opts.checkers as number | undefined,
    compat: opts.compat as CliMigrateOptions["compat"],
    cwd: opts.cwd as string | undefined,
    dir,
    dryRun: opts.dryRun as boolean | undefined,
    exclude: opts.exclude as string[] | undefined,
    fixTsconfig: Boolean(opts.fixTsconfig),
    include: opts.include as string[] | undefined,
    install: Boolean(opts.install),
    nightly: Boolean(opts.nightly),
    pm: opts.pm as CliMigrateOptions["pm"],
    stable: Boolean(opts.stable),
    test: Boolean(opts.test),
    updateCi: Boolean(opts.updateCi),
    updateDocs: Boolean(opts.updateDocs),
    updateVscode: Boolean(opts.updateVscode),
    write: opts.write as boolean | undefined,
    yes: Boolean(opts.yes),
  };
}

sharedOptions(
  program
    .command("scan")
    .description("Scan the project and report migration readiness")
    .action(async (dir, opts) => {
      await runScan(resolveMigrateOptions(toOptions(dir, opts)));
    })
);

sharedOptions(
  program
    .command("migrate")
    .description("Plan or apply migration from tsgo to tsc")
    .option("--dry-run", "Print planned changes without writing files")
    .option("--write", "Apply changes")
    .option("--install", "Run package manager install after patching")
    .option("--test", "Run verification commands after install")
    .option("--update-ci", "Patch GitHub Actions workflow files")
    .option("--update-vscode", "Patch .vscode/settings.json")
    .option("--fix-tsconfig", "Auto-fix deprecated tsconfig settings")
    .option("--update-docs", "Replace tsgo in documentation files")
    .option(
      "--checkers <number>",
      "Add --checkers flag to tsc commands",
      parseIntOption
    )
    .option(
      "--builders <number>",
      "Add --builders flag to tsc -b commands",
      parseIntOption
    )
    .option("--yes", "Skip confirmation prompts")
    .action(async (dir, opts) => {
      const options = toOptions(dir, opts);
      await runMigrate(
        resolveMigrateOptions({
          ...options,
          dryRun: options.dryRun ?? !options.write,
        })
      );
    })
);

sharedOptions(
  program
    .command("doctor")
    .description("Check migration health and verification status")
    .action(async (dir, opts) => {
      await runDoctor(resolveMigrateOptions(toOptions(dir, opts)));
    })
);

program
  .command("rollback")
  .description("Restore files from the latest migration snapshot")
  .argument("[dir]", "Project directory", ".")
  .option("--cwd <dir>", "Project directory (same as positional [dir])")
  .action(async (dir, opts) => {
    await runRollback(resolveTargetDir(opts.cwd ?? dir));
  });

await program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
