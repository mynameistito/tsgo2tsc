import { confirm } from "@clack/prompts";

import { applyActions } from "../core/apply.js";
import { buildProjectContext } from "../core/context.js";
import { printDryRunOutput } from "../core/dry-run.js";
import { createMigrationPlan } from "../core/planner.js";
import { formatReport } from "../core/report.js";
import {
  collectFilesToBackup,
  createSnapshot,
  rollbackFromSnapshot,
  serializeActions,
} from "../core/snapshot.js";
import { runVerification } from "../core/verify.js";
import { hasNativePreviewInAny } from "../scanners/package-json.js";
import type { MigrateOptions, MigrationRecord } from "../types.js";
import { relativePath } from "../utils/fs.js";
import { log } from "../utils/logger.js";

const PACKAGE_VERSION = "0.1.0";

export const runMigrate = async (options: MigrateOptions): Promise<void> => {
  const ctx = await buildProjectContext(options);
  const plan = await createMigrationPlan(ctx);
  const nativePreviewPkgs = hasNativePreviewInAny(ctx.packages);

  if (nativePreviewPkgs.length === 0 && plan.actions.length === 0) {
    log.warn(
      "Nothing to migrate. No @typescript/native-preview or tsgo usage found."
    );
    return;
  }

  if (options.dryRun) {
    await printDryRunOutput(
      plan,
      [...plan.actions, ...plan.warnings],
      nativePreviewPkgs.length,
      ctx.rootDir
    );
    return;
  }

  if (!options.yes && options.write) {
    const shouldProceed = await confirm({
      message: `Apply ${plan.mode} migration to ${nativePreviewPkgs.length || ctx.packages.length} package(s)?`,
    });
    if (shouldProceed !== true) {
      log.info("Migration cancelled.");
      return;
    }
  }

  const filesToBackup = collectFilesToBackup(plan.actions);
  const createdAt = new Date().toISOString();

  const record: MigrationRecord = {
    actions: serializeActions(plan.actions),
    commandsRun: [],
    createdAt,
    filesChanged: [],
    mode: plan.mode,
    packageManager: ctx.packageManager,
    version: PACKAGE_VERSION,
    warnings: plan.warnings
      .filter((a) => a.type === "warn")
      .map((a) => (a.type === "warn" ? a.message : "")),
  };

  const snapshotDir = await createSnapshot(ctx.rootDir, filesToBackup, record);

  let filesChanged: string[];
  try {
    filesChanged = await applyActions(plan.actions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await rollbackFromSnapshot(ctx.rootDir, snapshotDir);
      log.error(
        `Migration failed during apply; rolled back snapshot. ${message}`
      );
    } catch {
      log.error(
        `Migration failed during apply: ${message}. Run \`tsgo2tsc rollback\` to restore from the snapshot.`
      );
    }
    process.exitCode = 1;
    return;
  }
  record.filesChanged = filesChanged.map((f) => relativePath(ctx.rootDir, f));

  if (options.install || options.test) {
    const verification = await runVerification(
      ctx.rootDir,
      ctx.packageManager,
      ctx.packages,
      plan.mode,
      { install: options.install, test: options.test }
    );
    record.commandsRun = verification.commandsRun;
    record.verification = verification.results;
  }

  console.log(formatReport(plan, record));

  log.success(`Migration applied (${plan.mode}).`);
  log.info(`Changed ${record.filesChanged.length} file(s).`);
  log.dim("Rollback data is stored in your local tsgo2tsc state directory.");

  const failedChecks = record.verification?.filter((v) => !v.success) ?? [];
  if (failedChecks.length > 0) {
    log.warn("Migration applied with failing checks:");
    for (const check of failedChecks) {
      log.error(`  ${check.command}`);
    }
  }
};
