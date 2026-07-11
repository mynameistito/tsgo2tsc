import { buildProjectContext } from "../core/context.js";
import { createMigrationPlan } from "../core/planner.js";
import { formatScanOutput } from "../core/report.js";
import {
  formatTargetVersions,
  resolveMigrationTargetVersions,
} from "../core/versions.js";
import {
  formatNativePreviewFinding,
  scanNativePreviewUsage,
} from "../scanners/native-preview.js";
import type { MigrateOptions } from "../types.js";
import { log } from "../utils/logger.js";

export async function runScan(options: MigrateOptions): Promise<void> {
  const ctx = await buildProjectContext(options);
  const plan = await createMigrationPlan(ctx);
  const findings = await scanNativePreviewUsage(ctx);

  log.bold("tsgo2tsc scan");
  log.line();

  if (findings.length === 0) {
    log.warn("No @typescript/native-preview or tsgo usage found.");
  } else {
    log.info("Native preview / tsgo usage:");
    for (const finding of findings) {
      log.dim(`  ${formatNativePreviewFinding(finding)}`);
    }
  }

  log.line();
  log.dim(
    formatScanOutput(
      ctx.packageManager,
      ctx.packages.map((p) => p.dir),
      plan
    )
  );

  const targetVersions = await resolveMigrationTargetVersions(plan.mode);
  log.line();
  log.bold("Target TypeScript versions:");
  for (const line of formatTargetVersions(plan.mode, targetVersions)) {
    log.dim(line);
  }
  log.dim(`  (${targetVersions.typescript.note})`);

  if (plan.reasons.length > 0) {
    log.line();
    log.bold("Compat reasons:");
    for (const reason of plan.reasons) {
      log.dim(`  - ${reason}`);
    }
  }
}
