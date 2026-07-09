import { confirm } from "@clack/prompts";
import { buildProjectContext } from "../core/context.js";
import { createMigrationPlan } from "../core/planner.js";
import { applyActions } from "../core/apply.js";
import {
  collectFilesToBackup,
  createSnapshot,
} from "../core/snapshot.js";
import {
  writeReport,
  writeSnapshotReport,
} from "../core/report.js";
import { printDryRunOutput } from "../core/dry-run.js";
import { runVerification } from "../core/verify.js";
import { hasNativePreviewInAny } from "../scanners/package-json.js";
import { relativePath } from "../utils/fs.js";
import { log } from "../utils/logger.js";
import type { MigrateOptions, MigrationRecord } from "../types.js";

const PACKAGE_VERSION = "0.1.0";

export async function runMigrate(options: MigrateOptions): Promise<void> {
  const ctx = await buildProjectContext(options);
  const plan = await createMigrationPlan(ctx);
  const nativePreviewPkgs = hasNativePreviewInAny(ctx.packages);

  if (nativePreviewPkgs.length === 0 && plan.actions.length === 0) {
    log.warn("Nothing to migrate. No @typescript/native-preview or tsgo usage found.");
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

  if (options.dryRun && !options.write) {
    await printDryRunOutput(
      plan,
      [...plan.actions, ...plan.warnings],
      nativePreviewPkgs.length,
      ctx.rootDir,
    );
    return;
  }

  const filesToBackup = collectFilesToBackup(plan.actions);
  const createdAt = new Date().toISOString();

  const record: MigrationRecord = {
    version: PACKAGE_VERSION,
    createdAt,
    mode: plan.mode,
    packageManager: ctx.packageManager,
    filesChanged: [],
    actions: plan.actions,
    commandsRun: [],
    warnings: plan.warnings
      .filter((a) => a.type === "warn")
      .map((a) => (a.type === "warn" ? a.message : "")),
  };

  const filesChanged = await applyActions(plan.actions);
  record.filesChanged = filesChanged.map((f) =>
    relativePath(ctx.rootDir, f),
  );

  const snapshotDir = await createSnapshot(
    ctx.rootDir,
    filesToBackup,
    record,
  );
  await writeSnapshotReport(snapshotDir, plan, record);

  if (options.install || options.test) {
    const verification = await runVerification(
      ctx.rootDir,
      ctx.packageManager,
      ctx.packages,
      plan.mode,
      { install: options.install, test: options.test },
    );
    record.commandsRun = verification.commandsRun;
    record.verification = verification.results;
  }

  await writeReport(ctx.rootDir, plan, record);

  log.success(`Migration applied (${plan.mode}).`);
  log.info(`Changed ${record.filesChanged.length} file(s).`);
  log.dim(`Snapshot: .tsgo2tsc/snapshots/${createdAt.replace(/:/g, "-")}`);
  log.dim("Report: .tsgo2tsc/report.md");

  const failedChecks =
    record.verification?.filter((v) => !v.success) ?? [];
  if (failedChecks.length > 0) {
    log.warn("Migration applied with failing checks:");
    for (const check of failedChecks) {
      log.error(`  ${check.command}`);
    }
  }
}
