import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildProjectContext } from "../core/context.js";
import { createMigrationPlan } from "../core/planner.js";
import { getLatestSnapshot, getBackupRoot } from "../core/snapshot.js";
import {
  formatNativePreviewFinding,
  scanNativePreviewUsage,
} from "../scanners/native-preview.js";
import {
  formatTargetVersions,
  resolveMigrationTargetVersions,
} from "../core/versions.js";
import { log } from "../utils/logger.js";
import type { MigrateOptions, MigrationRecord } from "../types.js";

export async function runDoctor(options: MigrateOptions): Promise<void> {
  const ctx = await buildProjectContext(options);
  const plan = await createMigrationPlan(ctx);
  const findings = await scanNativePreviewUsage(ctx);

  log.bold("tsgo2tsc doctor");
  log.line();

  log.info(`Package manager: ${ctx.packageManager}`);
  log.info(`Packages: ${ctx.packages.length}`);
  log.info(`Recommended mode: ${plan.mode}`);

  const targetVersions = await resolveMigrationTargetVersions(plan.mode);
  log.line();
  log.bold("Target TypeScript versions:");
  for (const line of formatTargetVersions(plan.mode, targetVersions)) {
    log.dim(line);
  }

  if (findings.length > 0) {
    log.line();
    log.warn("Native preview / tsgo still detected:");
    for (const finding of findings) {
      log.dim(`  ${formatNativePreviewFinding(finding)}`);
    }
  } else {
    log.line();
    log.success("No @typescript/native-preview or tsgo usage found.");
  }

  const latestPath = join(getBackupRoot(ctx.rootDir), "latest.json");
  try {
    const latest = JSON.parse(
      await readFile(latestPath, "utf8"),
    ) as { snapshot: string; createdAt: string };
    log.info(`Latest migration snapshot: ${latest.createdAt}`);
  } catch {
    log.dim("No migration snapshot found.");
  }

  const snapshotDir = await getLatestSnapshot(ctx.rootDir);
  if (snapshotDir) {
    try {
      const record = JSON.parse(
        await readFile(join(snapshotDir, "migration.json"), "utf8"),
      ) as MigrationRecord;
      if (record.verification) {
        log.line();
        log.bold("Last verification:");
        for (const v of record.verification) {
          if (v.success) {
            log.success(v.command);
          } else {
            log.error(`${v.command} (failed)`);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (plan.detectedTools.length > 0) {
    log.line();
    log.bold("Tools requiring compat consideration:");
    for (const tool of plan.detectedTools) {
      log.dim(`  - ${tool}`);
    }
  }
}
